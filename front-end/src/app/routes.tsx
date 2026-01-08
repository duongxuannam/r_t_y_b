import { createBrowserRouter, } from 'react-router-dom'
import App from '../App'
import AboutPage from '../pages/AboutPage'
import AuthPage from '../pages/AuthPage'
import TodoPage from '../pages/TodoPage'
import NotFoundPage from '../pages/NotFoundPage'
import ResetPage from '../pages/ResetPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TodoPage /> },
      { path: 'app', element: <TodoPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'auth', element: <AuthPage /> },
      { path: 'reset', element: <ResetPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
