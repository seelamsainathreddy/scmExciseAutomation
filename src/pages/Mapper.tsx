import { useLocation } from 'react-router-dom';
import ExcelUpload from '../components/ExcelUpload';

const Mapper = () => {
  const location = useLocation();
  const responseData = location.state?.responseData; // Access the response data from location state

  return (
    <div>
      <h2>Mapper Component</h2>
      {responseData ? ( // Check if responseData exists
         <ExcelUpload  />
      ) : (
        <p>No response data available.</p> // Message if no data is available
      )}
    </div>
  );
};

export default Mapper;