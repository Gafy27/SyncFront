import { PythonExecutorExample } from "@/components/python-executor-example";

export default function PythonExecutor() {
  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Python SymPy Executor</h1>
        <p className="text-muted-foreground">
          Ejecuta código Python con SymPy y obtén expresiones matemáticas como strings
        </p>
      </div>
      <PythonExecutorExample />
    </div>
  );
}

