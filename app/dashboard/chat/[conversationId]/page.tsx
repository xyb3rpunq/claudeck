import ChatWindow from "@/components/ChatWindow";

export const dynamic = "force-dynamic";

export default function ChatPage({
  params,
}: {
  params: { conversationId: string };
}) {
  return <ChatWindow conversationId={params.conversationId} />;
}
