import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DemoInterceptorContextType {
  showDemoDialog: (method: string, url: string) => Promise<boolean>;
}

const DemoInterceptorContext = createContext<DemoInterceptorContextType | undefined>(undefined);

let globalShowDemoDialog: ((method: string, url: string) => Promise<boolean>) | null = null;

export function getDemoInterceptor(): ((method: string, url: string) => Promise<boolean>) | null {
  return globalShowDemoDialog;
}

export function DemoInterceptorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ resolve: (value: boolean) => void; method: string; url: string } | null>(null);

  const showDemoDialog = (method: string, url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingRequest({ resolve, method, url });
      setIsOpen(true);
    });
  };

  useEffect(() => {
    globalShowDemoDialog = showDemoDialog;
    return () => {
      globalShowDemoDialog = null;
    };
  }, []);

  const handleClose = (proceed: boolean) => {
    setIsOpen(false);
    if (pendingRequest) {
      pendingRequest.resolve(proceed);
      setPendingRequest(null);
    }
  };

  return (
    <DemoInterceptorContext.Provider value={{ showDemoDialog }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modo Demo</AlertDialogTitle>
            <AlertDialogDescription>
                Al ser una versión de demostración, deshabilitamos la escritura en la base de datos. 
                Si te interesa usar nuestra plataforma, puedes registrarte en nuestro sitio web.
                <br />
                <br />
                <a href="https://www.autentio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Regístrate aquí
                </a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => handleClose(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DemoInterceptorContext.Provider>
  );
}

export function useDemoInterceptor() {
  const context = useContext(DemoInterceptorContext);
  if (context === undefined) {
    throw new Error('useDemoInterceptor must be used within a DemoInterceptorProvider');
  }
  return context;
}

