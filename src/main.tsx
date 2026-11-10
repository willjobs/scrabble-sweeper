import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
document.documentElement.dataset.appBuild = __APP_BUILD__;
createRoot(document.getElementById("root")!).render(<App />);
