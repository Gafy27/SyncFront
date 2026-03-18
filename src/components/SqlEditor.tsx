import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface SqlEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    className?: string;
    readOnly?: boolean;
}

function getIsDark() {
    if (typeof document === "undefined") return false;
    if (document.documentElement.classList.contains("dark")) return true;
    try {
        return localStorage.getItem("theme") === "dark";
    } catch {
        return false;
    }
}

function hslVarToHex(varName: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return "#ffffff";
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;visibility:hidden;background:hsl(${value})`;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).backgroundColor;
    document.body.removeChild(el);
    const m = rgb.match(/[\d.]+/g);
    if (m && m.length >= 3) {
        const r = Math.round(Number(m[0])).toString(16).padStart(2, "0");
        const g = Math.round(Number(m[1])).toString(16).padStart(2, "0");
        const b = Math.round(Number(m[2])).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
    }
    return "#ffffff";
}

function applyEditorTheme(monaco: any, isDark: boolean) {
    const bg = hslVarToHex("--background");
    const card = hslVarToHex("--card");
    const muted = hslVarToHex("--muted");
    const fg = hslVarToHex("--foreground");
    const base = isDark ? "vs-dark" : "vs";
    monaco.editor.defineTheme("sql-editor-theme", {
        base,
        inherit: true,
        rules: [
            { token: "keyword", foreground: isDark ? "569CD6" : "0000ff" },
            { token: "string", foreground: isDark ? "CE9178" : "a31515" },
        ],
        colors: {
            "editor.background": bg,
            "editor.foreground": isDark ? "#d4d4d4" : fg,
            "editor.lineHighlightBackground": card,
            "editorLineNumber.foreground": muted,
        },
    });
    monaco.editor.setTheme("sql-editor-theme");
}

export function SqlEditor({ value, onChange, className, readOnly = false }: SqlEditorProps) {
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);
    const [isDark, setIsDark] = useState(getIsDark);

    useEffect(() => {
        const sync = () => setIsDark(getIsDark());
        sync();
        const t = setTimeout(sync, 0);
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, { attributeFilter: ["class"] });
        return () => {
            clearTimeout(t);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!monaco) return;

        monaco.languages.registerCompletionItemProvider("sql", {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };
                const suggestions = [
                    { label: "SELECT", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "SELECT ", range },
                    { label: "FROM", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "FROM ", range },
                    { label: "WHERE", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "WHERE ", range },
                ];
                return { suggestions };
            },
        });
    }, [monaco]);

    useEffect(() => {
        if (!monaco) return;
        applyEditorTheme(monaco, isDark);
    }, [monaco, isDark]);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        if (monaco) applyEditorTheme(monaco, getIsDark());
    };

    return (
        <div className={`h-full w-full rounded-md overflow-hidden border border-border/50 shadow-inner bg-background ${className}`}>
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
