import { LoaderCircle, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CommentMarkdownAsync } from '@/components/sidebar/comment-markdown-lazy'
import { translate } from '@/i18n/i18n'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import type { DoorayComment } from '../../../../../shared/extensions/dooray/dooray-types'
import { handleDoorayMarkdownLinkClick } from '../lib/dooray-open-link'
import type { useDoorayComments } from './use-dooray-comments'

type CommentsState = ReturnType<typeof useDoorayComments>

function CommentCard({ comment }: { comment: DoorayComment }): React.JSX.Element {
  return (
    <div className="rounded-md border border-border/50 bg-muted/20">
      <div className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-2">
        <span className="truncate text-[13px] font-semibold text-foreground">
          {comment.authorName ||
            translate('auto.ext.dooray.components.DoorayIssueWorkspace.unknown', 'Unknown')}
        </span>
        <span className="shrink-0 text-[12px] text-muted-foreground">
          {formatUiRelativeTimeFromDate(comment.createdAt)}
        </span>
      </div>
      <div className="px-3 py-2">
        <CommentMarkdownAsync
          content={comment.body}
          className="text-[13px] leading-relaxed"
          onLinkClick={handleDoorayMarkdownLinkClick}
        />
      </div>
    </div>
  )
}

export function DoorayIssueCommentsSection({
  comments,
  commentsLoading,
  commentsError,
  retryLoadComments
}: Pick<
  CommentsState,
  'comments' | 'commentsLoading' | 'commentsError' | 'retryLoadComments'
>): React.JSX.Element {
  return (
    <section className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">
            {translate('auto.ext.dooray.components.DoorayIssueWorkspace.comments', 'Comments')}
          </span>
          {comments.length > 0 ? (
            <span className="text-[12px] text-muted-foreground">{comments.length}</span>
          ) : null}
        </div>
        {commentsError ? (
          <Button
            variant="outline"
            size="xs"
            onClick={retryLoadComments}
            disabled={commentsLoading}
          >
            {commentsLoading ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            {translate('auto.ext.dooray.components.DoorayIssueWorkspace.retry', 'Retry')}
          </Button>
        ) : null}
      </div>
      {commentsError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {commentsError}
        </div>
      ) : commentsLoading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate(
            'auto.ext.dooray.components.DoorayIssueWorkspace.no_comments',
            'No comments yet.'
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  )
}

export function DoorayCommentComposer({
  commentDraft,
  setCommentDraft,
  commentSubmitting,
  canSubmitComment,
  submitComment
}: Pick<
  CommentsState,
  'commentDraft' | 'setCommentDraft' | 'commentSubmitting' | 'canSubmitComment' | 'submitComment'
>): React.JSX.Element {
  return (
    <div className="flex gap-2">
      <Textarea
        value={commentDraft}
        onChange={(event) => setCommentDraft(event.target.value)}
        placeholder={translate(
          'auto.ext.dooray.components.DoorayIssueWorkspace.comment_placeholder',
          'Add a Dooray comment...'
        )}
        rows={2}
        disabled={commentSubmitting}
        className="min-h-10 flex-1 resize-none"
      />
      <Button
        onClick={() => void submitComment()}
        disabled={!canSubmitComment || commentSubmitting}
        className="self-end"
      >
        {commentSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {translate('auto.ext.dooray.components.DoorayIssueWorkspace.comment', 'Comment')}
      </Button>
    </div>
  )
}
