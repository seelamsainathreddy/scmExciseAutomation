// src/ExcelUpload.tsx
import React, { useEffect, useState } from 'react';
import Suggestions from './Suggestions';
import { useLocation } from 'react-router-dom';




const ExcelUpload: React.FC = ( ) => {


    const location = useLocation();
    const response = location.state?.responseData;
    const fileName = location.state?.fileName;

    console.log(location.state)
     // Access the response data from location state

  const [data, setData] = useState<Array<Record<string, string>>>([]);
  // const [columns, setColumns] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPosition, setSuggestionPosition] = useState<{ x: number; y: number } | null >(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{rowIndex: number; columnId: string} | null>(null);

    //console.log(JSON.stringify(response))
    const localCodesMap = response['localCodesMap'];
    const allSuggestions = Object.keys(response['localCodesMap']);
    console.log(localCodesMap, allSuggestions)


useEffect(() => {
  setDataFromJson(JSON.stringify(response['localBrands']))
},[])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name); // File selection log

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result;
      console.log('Raw file content:', fileContent); // Raw content log
      
      if (typeof fileContent === 'string') {
        setDataFromJson(fileContent);
      }
    };
   // console.log(data)
    reader.readAsText(file);
  };

  const handleCellClick = (brandName: string, event: React.MouseEvent<HTMLTableCellElement>, rowIndex: number, columnId: string) => {
    setSelectedCell({rowIndex, columnId});
    const suggestionsList = getSuggestions(brandName);
    //console.log("suggestions : ", suggestionsList);
    setSuggestions(suggestionsList);
    setSuggestionPosition({ x: event.clientX, y: event.clientY });
    setIsSuggestionsVisible(true);
  };

  const handleOutsideClick = () => {
        // setIsSuggestionsVisible(false);
        // setSuggestions([]);
        // console.log("clicking outside box", isSuggestionsVisible, suggestionPosition)
  };

  const getSuggestions = (brandName: string): string[] => {
    return rankedSuggestions(allSuggestions, brandName);
  };

  const rankedSuggestions = (suggestions: string[], brandName: string): string[] => {
    // 1. Levenshtein Distance (Edit Distance)
    const levenshteinSimilarity = (a: string, b: string): number => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          const cost = a[j-1] === b[i-1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i-1][j] + 1,    // deletion
            matrix[i][j-1] + 1,    // insertion
            matrix[i-1][j-1] + cost // substitution
          );
        }
      }
      const distance = matrix[b.length][a.length];
      return 1 - (distance / Math.max(a.length, b.length));
    };

    // 2. Jaro-Winkler Similarity (optimized for prefixes)
    const jaroWinkler = (a: string, b: string): number => {
      const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
      
      // Matching window size
      const matchWindow = Math.floor(Math.max(shorter.length / 2 - 1, 0));
      
      let matches = 0;
      let transpositions = 0;
      const matchesFlags = new Array(shorter.length).fill(false);
      
      for (let i = 0; i < longer.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, shorter.length);
        
        for (let j = start; j < end; j++) {
          if (!matchesFlags[j] && longer[i] === shorter[j]) {
            matchesFlags[j] = true;
            matches++;
            if (i !== j) transpositions++;
            break;
          }
        }
      }
      
      if (matches === 0) return 0;
      
      transpositions /= 2;
      const jaro = (
        (matches / a.length) +
        (matches / b.length) + 
        ((matches - transpositions) / matches)
      ) / 3;

      // Winkler boost for prefix matches (up to 4 characters)
      const prefixScale = 0.1;
      const prefixLimit = Math.min(4, a.length, b.length);
      let prefix = 0;
      
      while (prefix < prefixLimit && a[prefix] === b[prefix]) prefix++;
      
      return jaro + (prefix * prefixScale * (1 - jaro));
    };

    // Combine both metrics with weights
    const combinedScore = (a: string, b: string): number => {
      const jw = jaroWinkler(a, b);
      const ls = levenshteinSimilarity(a, b);
      return (jw * 0.6) + (ls * 0.4); // Adjust weights as needed
    };

    return suggestions
      .map(suggestion => ({
        suggestion,
        score: combinedScore(brandName.toLowerCase().replace(/ \(.*?\)$/, ''), suggestion.toLowerCase())
      }))
      .sort((a, b) => b.score - a.score)// Threshold to filter poor matches
      .map(item => item.suggestion);
  };

  const handleSuggestionSelect = (selectedValue: string) => {
    if (!selectedCell) return;
    console.log(selectedCell, selectedValue)
    setData(prevData => 
      prevData.map((row, index) => {
        if (index === selectedCell.rowIndex) {
          console.log("inside selected row")
          return {
            ...row,
            'Govt_Brand_Names': selectedValue // Update Govt_Brand_Names column
          };
        }
        return row;
      })
    );
    setIsSuggestionsVisible(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission

    try {
      const mapping = data.reduce((accumulator, row) => {
        const govBrandName = row['Govt_Brand_Names'];
        const localCode = localCodesMap?.[govBrandName as keyof typeof localCodesMap] || '';
        accumulator[row['Brand Name']] = localCode;
        return accumulator;
      }, {});

      const json = JSON.stringify({ 'brandLocalCodesMapping': mapping, 'fileName': fileName }, null, 2);
      console.log("body sent to server is ", json)
      const response = await fetch('http://scmgovtexcisebackend-production.up.railway.app:8080/downloadExcelFiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set the content type to JSON
        },
        body: json, // Send the JSON data in the request body
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Create a Blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob); // Create a URL for the Blob

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'downloadedFile.zip'); // Set the file name

      // Append to the body
      document.body.appendChild(link);
      link.click(); // Trigger the download

      // Clean up the DOM safely
      if (link.parentNode) {
        link.parentNode.removeChild(link); // Only remove if parentNode exists
      }

      // Optionally, revoke the object URL after the download
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error); // Handle error
    }
  };

  const getNearestBrand  = (brand: string, item: string) => {
     const results = getSuggestions(brand);
     const topSuggestions = results.slice(0, 20);
     return topSuggestions.find(suggestion => suggestion.includes(item.match(/\d+/g)?.join('') || '')) || '';
  }

  
  const setDataFromJson = (json: string) => {
    try {
      const parsedData: Record<string, string[]> = JSON.parse(json);      
      const formattedData = Object.entries(parsedData).flatMap(([brand, items]) => {
      return items.map((item: string) => ({
          'Brand Name': `${brand} (${item})`,
          'Govt_Brand_Names': `${getNearestBrand(brand, item)}`
        }));
      });
      setData(formattedData);
    } catch (error) {
      console.error('JSON parsing error:', error);
    }
  };

  const tableHeaderStyle = {
    border: '1px solid #ddd',
    padding: '12px',
    backgroundColor: '#f2f2f2',
    textAlign: 'left' as const
  };

  const tableCellStyle = {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left' as const
  };

 
  return (
    <>

    <div style={{ marginBottom: '20px' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} />
    </div>
    <div className='container' style={{ position: 'relative' }} onClick={handleOutsideClick}>
      <div className="data">
        {data.length > 0 && (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Brand Name</th>
                <th style={tableHeaderStyle}>Govt_Brand_Names</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td 
                    style={tableCellStyle}
                    onClick={(e) => handleCellClick(row['Brand Name'], e, index, 'Brand Name')}
                  >
                    {row['Brand Name']}
                  </td>
                  <td style={tableCellStyle}>
                    {row['Govt_Brand_Names']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="suggestions">
      {isSuggestionsVisible && suggestionPosition && (
        <Suggestions 
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

    </div>

    </div>

    {data.length > 0 && (
        <form onSubmit={handleSubmit}>
            <button 
            type="submit"
            style={{
                marginLeft: '100px',
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            }}
            >
            Download Excel Files
            </button>
        </form>
    )}
    </>
  );
};

export default ExcelUpload;