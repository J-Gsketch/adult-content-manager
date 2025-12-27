import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ImportJobs from "./pages/ImportJobs";
import Categories from "./pages/Categories";
import Tags from "./pages/Tags";
import MediaLibrary from "./pages/MediaLibrary";
import Settings from "./pages/Settings";
import UploadQueue from "./pages/UploadQueue";
import Revenue from "./pages/Revenue";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/import-jobs"} component={ImportJobs} />
      <Route path={"/categories"} component={Categories} />
      <Route path={"/tags"} component={Tags} />
      <Route path={"/media-library"} component={MediaLibrary} />
      <Route path={"/upload-queue"} component={UploadQueue} />
      <Route path={"/revenue"} component={Revenue} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
