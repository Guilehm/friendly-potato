import Layout from './templates/Layout'
import Home from './templates/Home'
import { createGlobalStyle } from 'styled-components'
import Login from './templates/Login'
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from 'react-router-dom'


const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`

const App = (): JSX.Element => (
  <div className="App">
    <GlobalStyle />
    <Router>
      <Switch>

        <Route path="/login">
          <Login />
        </Route>

        <Route path="/">
          <Layout>
            <Home />
          </Layout>
        </Route>

      </Switch>
    </Router>
  </div>
)

export default App
