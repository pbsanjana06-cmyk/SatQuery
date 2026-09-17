# React + TypeScript + Vite

## Free local image analysis

SatQuery uses Ollama for live satellite-image analysis without OpenAI API charges.

1. Install Ollama from [ollama.com](https://ollama.com/download).
2. Run `ollama pull llama3.2-vision` in PowerShell.
3. Start Ollama with `ollama serve` if it is not already running.
4. Start SatQuery with `npm run dev` and open the local Vite URL.

The app connects to Ollama through the Vite `/ollama` proxy. This free setup runs on the computer where Ollama is installed; the deployed Vercel site cannot access your local Ollama server.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
