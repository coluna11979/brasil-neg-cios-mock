import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import WhatsAppChat from "@/components/corretor/WhatsAppChat";

const CorretorMensagens = () => {
  usePageTitle("Mensagens");
  return (
    <CorretorLayout>
      <WhatsAppChat />
    </CorretorLayout>
  );
};

export default CorretorMensagens;
