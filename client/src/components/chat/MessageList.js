import { useSelector } from 'react-redux';
import MessageBubble from './MessageBubble';
import { isToday, isYesterday, format } from 'date-fns';

const DateDivider = ({ date }) => {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-4">
      <hr className="flex-1 border-surface-700" />
      <span className="text-xs text-zinc-500 px-2">{label}</span>
      <hr className="flex-1 border-surface-700" />
    </div>
  );
};

export default function MessageList({ messages, chatId, chat }) {
  const { user } = useSelector((s) => s.auth);
  let lastDate = null;

  // Build a map of userId -> publicKey from chat participants for E2EE decryption
  const publicKeyMap = {};
  chat?.participants?.forEach((p) => {
    if (p._id && p.publicKey) publicKeyMap[p._id] = p.publicKey;
  });

  return (
    <>
      {messages.map((msg) => {
        const msgDate = new Date(msg.createdAt);
        const showDivider = !lastDate || msgDate.toDateString() !== lastDate.toDateString();
        if (showDivider) lastDate = msgDate;

        const senderId = msg.sender?._id || msg.sender;
        const senderPublicKey = publicKeyMap[senderId] || msg.sender?.publicKey;

        return (
          <div key={msg._id}>
            {showDivider && <DateDivider date={msgDate} />}
            <MessageBubble
              message={msg}
              isOwn={senderId === user._id || senderId === user._id?.toString()}
              chatId={chatId}
              senderPublicKey={senderPublicKey}
            />
          </div>
        );
      })}
    </>
  );
}
