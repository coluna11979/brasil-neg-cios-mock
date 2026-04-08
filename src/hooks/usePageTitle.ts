import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | NegócioJá` : "NegócioJá - Compre e Venda Negócios";
  }, [title]);
};

export default usePageTitle;
