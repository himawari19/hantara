"use client";

import { useState } from "react";
import { useActivityStore, ActivityEvent } from "@/store/activity-store";
import { usePresenceStore } from "@/store/presence-store";
import { Activity, MessageSquare, Trash2, Clock, Send, Filter } from "lucide-react";

interface ActivityFeedProps {
  requestId?: string;
  showComments?: boolean;
}

export function ActivityFeed({ requestId, showComments = true }: ActivityFeedProps) {
  const { events, comments, addComment, resolveComment, deleteComment, clearEvents } = useActivityStore();
  const { localUserId, localUserName, localUserColor } = usePresenceStore();
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "comments">("activity");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredEvents = requestId
    ? events.filter((e) => e.targetId === requestId)
    : filterType === "all"
    ? events
    : events.filter((e) => e.type === filterType);

  const filteredComments = requestId
    ? comments.filter((c) => c.requestId === requestId)
    : comments;

  const handleAddComment = () => {
    if (!newComment.trim() || !requestId) return;
    addComment({
      requestId,
      userId: localUserId,
      userName: localUserName,
      userColor: localUserColor,
      text: newComment.trim(),
    });
    setNewComment("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeTab === "activity"
              ? "bg-[var(--accent)]/10 text-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Activity size={12} /> Activity
          <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 text-[9px]">{filteredEvents.length}</span>
        </button>
        {showComments && (
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              activeTab === "comments"
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <MessageSquare size={12} /> Comments
            <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 text-[9px]">
              {filteredComments.filter((c) => !c.resolved).length}
            </span>
          </button>
        )}

        {/* Filter (activity tab only) */}
        {activeTab === "activity" && !requestId && (
          <div className="ml-auto flex items-center gap-1">
            <Filter size={10} className="text-[var(--text-secondary)]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)] outline-none"
              aria-label="Filter activity type"
            >
              <option value="all">All</option>
              <option value="request_created">Created</option>
              <option value="request_updated">Updated</option>
              <option value="request_sent">Sent</option>
              <option value="request_deleted">Deleted</option>
              <option value="comment_added">Comments</option>
            </select>
          </div>
        )}

        {activeTab === "activity" && events.length > 0 && (
          <button
            type="button"
            onClick={clearEvents}
            className="ml-auto rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
            aria-label="Clear activity"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "activity" && (
          <div className="flex flex-col">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity size={24} className="mb-2 text-[var(--text-secondary)] opacity-30" />
                <span className="text-xs text-[var(--text-secondary)]">No activity yet</span>
              </div>
            ) : (
              filteredEvents.slice(0, 100).map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="flex flex-col">
            {filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare size={24} className="mb-2 text-[var(--text-secondary)] opacity-30" />
                <span className="text-xs text-[var(--text-secondary)]">No comments yet</span>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`flex gap-2.5 border-b border-[var(--border)] px-3 py-2.5 ${
                    comment.resolved ? "opacity-50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: comment.userColor }}
                  >
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">{comment.userName}</span>
                      <span className="text-[9px] text-[var(--text-secondary)]">{formatTime(comment.timestamp)}</span>
                      {comment.resolved && (
                        <span className="rounded bg-green-900/20 px-1 text-[8px] text-[var(--success)]">Resolved</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{comment.text}</p>

                    {/* Actions */}
                    {!comment.resolved && (
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => resolveComment(comment.id)}
                          className="text-[9px] text-[var(--success)] hover:underline"
                        >
                          Resolve
                        </button>
                        {comment.userId === localUserId && (
                          <button
                            type="button"
                            onClick={() => deleteComment(comment.id)}
                            className="text-[9px] text-[var(--error)] hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Comment Input */}
      {activeTab === "comments" && requestId && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="rounded bg-[var(--accent)] p-1.5 text-white disabled:opacity-30"
              aria-label="Send comment"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-3 py-2.5">
      {/* Avatar */}
      <div
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: event.userColor }}
      >
        {event.userName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[var(--text-primary)]">{event.userName}</span>
          <span className="text-[10px] text-[var(--text-secondary)]">{getEventVerb(event.type)}</span>
          <span className="text-[11px] font-medium text-[var(--accent)]">{event.targetName}</span>
        </div>
        {event.details && (
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{event.details}</p>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--text-secondary)]">
          <Clock size={8} />
          {formatTime(event.timestamp)}
        </div>
      </div>
    </div>
  );
}

function getEventVerb(type: ActivityEvent["type"]): string {
  switch (type) {
    case "request_created": return "created";
    case "request_updated": return "updated";
    case "request_deleted": return "deleted";
    case "request_sent": return "sent";
    case "collection_created": return "created collection";
    case "collection_deleted": return "deleted collection";
    case "folder_created": return "created folder";
    case "comment_added": return "commented on";
    case "environment_changed": return "changed environment";
    default: return "modified";
  }
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
