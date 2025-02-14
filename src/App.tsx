import { Link, Outlet } from "react-router-dom";

function App() {

  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/mapper">Mapper</Link> | <Link to="/editor">Editor</Link>
      </nav>
      <Outlet />

    </div>
  );
}

export default App;
