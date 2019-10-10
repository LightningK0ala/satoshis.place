import ReactGA from 'react-ga'
//
// Initialize Google Analytics
//
export const initGA = () => {
  if (process.env.GOOGLE_ANALYTICS) {
    ReactGA.initialize(process.env.GOOGLE_ANALYTICS)
  }
}
//
// Log Page Views
//
export const logPageView = () => {
  if (process.env.GOOGLE_ANALYTICS) {
    ReactGA.set({ page: window.location.pathname })
    ReactGA.pageview(window.location.pathname)
  }
}
