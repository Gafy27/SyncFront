import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface SqlEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  className?: string;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, className, readOnly = false }: SqlEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (monaco) {
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'SELECT',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT ',
            },
            {
              label: 'FROM',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'FROM ',
            },
            {
              label: 'WHERE',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'WHERE ',
            },
          ];
          return { suggestions };
        }
      });
      
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '569CD6' },
          { token: 'string', foreground: 'CE9178' },
        ],
        colors: {
          'editor.background': '#0f172a', // Tailwind slate-950
          'editor.lineHighlightBackground': '#1e293b',
        }
      });
      
      monaco.editor.setTheme('custom-dark');
    }
  }, [monaco]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className={`h-full w-full rounded-md overflow-hidden border border-border/50 shadow-inner ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly,
          padding: { top: 16, bottom: 16 },
          automaticLayout: true,
          theme: "custom-dark",
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Editor...
          </div>
        }
      />
    </div>
  );
}
