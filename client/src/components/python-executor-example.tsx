// Example React component using Python executor with Pyodide (browser-based)
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executeSymPyToLatex } from '@/lib/python-executor';

export function PythonExecutorExample() {
  const [code, setCode] = useState(`from sympy import *
x, y = symbols('x y')
expr = (x + y)**2
result = expand(expr)`);
  const [result, setResult] = useState('');
  const [latex, setLatex] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    setError('');
    setResult('');
    setLatex('');

    try {
      const response = await executeSymPyToLatex(code);
      
      if (response.error) {
        setError(response.error);
      } else {
        setResult(response.result);
        if (response.latex) {
          setLatex(response.latex);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Python SymPy Executor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Python Code (assign result to 'result' variable):</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="from sympy import *&#10;x = symbols('x')&#10;expr = sin(x)**2 + cos(x)**2&#10;result = simplify(expr)"
          />
          <p className="text-xs text-muted-foreground">
            Make sure to assign your final expression to the variable 'result'
          </p>
        </div>

        <Button onClick={handleExecute} disabled={loading}>
          {loading ? 'Executing...' : 'Execute Python'}
        </Button>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Result:</p>
              <p className="text-sm font-mono">{result}</p>
            </div>
            {latex && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">LaTeX:</p>
                <p className="text-sm font-mono">{latex}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

