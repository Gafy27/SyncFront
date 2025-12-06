// Python executor using Pyodide (runs Python in the browser)
// Install: npm install pyodide

import { loadPyodide, PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let isLoading = false;
let loadPromise: Promise<PyodideInterface> | null = null;

/**
 * Initialize Pyodide and load SymPy
 */
export async function initPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Load Pyodide
      pyodideInstance = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/',
      });

      // Install SymPy
      await pyodideInstance.loadPackage('sympy');

      // Set up Python environment
      await pyodideInstance.runPython(`
import sympy as sp
from sympy import *
      `);

      isLoading = false;
      return pyodideInstance;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Execute Python code with SymPy and return the result as a string
 * @param pythonCode - Python code to execute
 * @returns Result expression as string
 */
export async function executePython(
  pythonCode: string
): Promise<{ result: string; error?: string }> {
  try {
    const pyodide = await initPyodide();

    // Execute the Python code
    const result = pyodide.runPython(pythonCode);

    // Convert result to string
    let resultString: string;
    if (result === undefined || result === null) {
      resultString = '';
    } else if (typeof result === 'string') {
      resultString = result;
    } else {
      // Use Python's str() to convert SymPy expressions
      resultString = pyodide.runPython(`str(${result})`);
    }

    return { result: resultString };
  } catch (error) {
    return {
      result: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute SymPy code and get LaTeX representation
 * @param pythonCode - Python code that creates a SymPy expression (should assign to 'result' variable)
 * @returns LaTeX string representation
 */
export async function executeSymPyToLatex(
  pythonCode: string
): Promise<{ result: string; latex?: string; error?: string }> {
  try {
    const pyodide = await initPyodide();

    // Execute the Python code
    pyodide.runPython(pythonCode);

    // Check if 'result' variable exists
    const hasResult = pyodide.runPython('"result" in locals()');
    
    if (!hasResult) {
      return {
        result: '',
        error: 'No "result" variable found. Make sure to assign your SymPy expression to "result".',
      };
    }

    // Get string representation
    const resultString = pyodide.runPython('str(result)');

    // Get LaTeX representation
    let latexString: string | undefined;
    try {
      latexString = pyodide.runPython('sp.latex(result)');
    } catch {
      // If LaTeX conversion fails, just return the string
    }

    return {
      result: resultString,
      latex: latexString,
    };
  } catch (error) {
    return {
      result: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

