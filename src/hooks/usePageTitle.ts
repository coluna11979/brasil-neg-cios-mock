import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | NegociaAky` : "NegociaAky - Compre e Venda Negócios";
  }, [title]);
};

export default usePageTitle;
