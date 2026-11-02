import { useState } from "react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { inputCls, btnCls, labelCls, cardCls } from "@/components/ui-kit";

export function Comments({ habitId, initial }) {
  const [comments, setComments] = useState(initial || []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/habits/${habitId}/comments`, { text });
      setComments((c) => [...c, data]);
      setText("");
    } catch (err) { toast.error(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <section className={cardCls} data-testid="comments-section">
      <h2 className="mb-5 text-lg font-bold tracking-tight">Comments</h2>
      {comments.length === 0 ? (
        <p className="mb-6 text-sm text-[#69746D]" data-testid="no-comments">No comments yet. Ask a question or share some advice.</p>
      ) : (
        <ul className="mb-8 space-y-4" data-testid="comments-list">
          {comments.map((c) => (
            <li key={c.id} className="border-l-2 border-[#E3A387] pl-4" data-testid={`comment-${c.id}`}>
              <p className="text-sm font-semibold" data-testid={`comment-author-${c.id}`}>{c.author_name}</p>
              <p className="whitespace-pre-wrap leading-relaxed" data-testid={`comment-text-${c.id}`}>{c.text}</p>
              <p className="mt-1 text-xs text-[#69746D]">{new Date(c.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={post} className="space-y-3">
        <label htmlFor="comment" className={labelCls}>Comment</label>
        <textarea id="comment" rows={3} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} data-testid="comment-input" />
        <button type="submit" disabled={busy || !text.trim()} className={btnCls} data-testid="post-comment-button">Post comment</button>
      </form>
    </section>
  );
}
