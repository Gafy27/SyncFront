# Python (SymPy) Execution in TypeScript Frontend

This guide explains how to execute Python code (specifically SymPy) from a TypeScript/React frontend using Pyodide (browser-based execution).

## Pyodide (Browser-based)

**Pros:**
- Runs entirely in the browser (no server needed)
- Fast for simple operations
- No backend dependencies
- Works offline
- User privacy (code stays in browser)

**Cons:**
- Large initial load (~10MB)
- Slower than native Python
- Limited to browser capabilities

### Installation

```bash
npm install pyodide
```

### Usage

```typescript
import { executeSymPyToLatex } from '@/lib/python-executor';

// Execute SymPy code and get string + LaTeX representation
const response = await executeSymPyToLatex(`
from sympy import *
x, y = symbols('x y')
expr = (x + y)**2
result = expand(expr)
`);

// Returns: { result: "x**2 + 2*x*y + y**2", latex: "x^{2} + 2 x y + y^{2}" }
console.log(response.result);  // "x**2 + 2*x*y + y**2"
console.log(response.latex);   // "x^{2} + 2 x y + y^{2}"
```

**Important:** Make sure to assign your final SymPy expression to the variable `result` in your Python code.

### Example Component

See `client/src/components/python-executor-example.tsx` for a complete React component example.

### Access the Page

Navigate to `/python-executor` or click "Python Executor" in the sidebar to use the interactive Python executor.

## Example: SymPy Expression to String

Pyodide automatically converts SymPy expressions to strings:

```python
from sympy import *
x, y = symbols('x y')
expr = (x + y)**2
result = expand(expr)
# Result: "x**2 + 2*x*y + y**2"
```

The result is automatically converted to a string representation that you can display in your TypeScript UI. You also get LaTeX representation for mathematical rendering.

