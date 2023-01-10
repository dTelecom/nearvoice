import {Route, Routes} from 'react-router-dom';
import Home from './components/Home';
import Room from './components/Room';
import Join from './components/Join';
import './App.css';

const App = () => {
  return (
    <div className='page'>
      <Routes>
        <Route index element={<Home/>}/>
        <Route path={'/room/:sid'} element={<Room/>}/>
        <Route path={'/join/:sid'} element={<Join/>}/>
      </Routes>
    </div>
  );
}

export default App;
