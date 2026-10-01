import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { createBrowserUuid } from '@/lib/browser-uuid'
import {
  getCommentBodySubmitState,
  hasBoundedCommentBodyText
} from '@/lib/comment-body-submit-state'
import type {
  DoorayComment,
  DoorayIssue
} from '../../../../../shared/extensions/dooray/dooray-types'
import { useDoorayApi } from '../use-dooray-api'

const K = 'auto.ext.dooray.components.DoorayIssueWorkspace'

export function useDoorayComments(issue: DoorayIssue | null) {
  const api = useDoorayApi()
  const [comments, setComments] = useState<DoorayComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  // Bumped on every issue change so late responses for a previous issue are dropped.
  const requestIdRef = useRef(0)
  // The server may lag behind a just-posted comment, so refetches re-append these.
  const optimisticRef = useRef<DoorayComment[]>([])
  const issueId = issue?.id ?? null
  const projectId = issue?.projectId ?? null

  const loadComments = useCallback(
    async (requestId: number) => {
      if (!issueId || !projectId) {
        return
      }
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const fetched = await api.issueComments({ projectId, postId: issueId })
        if (requestId !== requestIdRef.current) {
          return
        }
        const fetchedIds = new Set(fetched.map((comment) => comment.id))
        setComments([
          ...fetched,
          ...optimisticRef.current.filter((comment) => !fetchedIds.has(comment.id))
        ])
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setCommentsError(error instanceof Error ? error.message : 'Failed to load comments.')
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setCommentsLoading(false)
        }
      }
    },
    [api, issueId, projectId]
  )

  // Reset during render (not in an effect) so a switched issue never flashes the old thread.
  const issueKey = `${projectId}/${issueId}`
  const [shownKey, setShownKey] = useState(issueKey)
  if (shownKey !== issueKey) {
    setShownKey(issueKey)
    setComments([])
    setCommentsError(null)
    setCommentsLoading(false)
    setCommentSubmitting(false)
    setCommentDraft('')
  }

  useEffect(() => {
    requestIdRef.current += 1
    optimisticRef.current = []
    void loadComments(requestIdRef.current)
  }, [loadComments])

  const retryLoadComments = useCallback(() => {
    void loadComments(requestIdRef.current)
  }, [loadComments])

  const submitComment = useCallback(async () => {
    if (!issueId || !projectId || commentSubmitting) {
      return
    }
    const bodyState = getCommentBodySubmitState(commentDraft)
    if (bodyState.status === 'empty') {
      return
    }
    if (bodyState.status === 'too-large-leading-whitespace') {
      toast.error(translate(`${K}.comment_too_large`, 'Comment is too large to submit safely.'))
      return
    }
    const requestId = requestIdRef.current
    setCommentSubmitting(true)
    try {
      const result = await api.addIssueComment({ projectId, postId: issueId, body: bodyState.body })
      if (!result.ok) {
        throw new Error(result.error)
      }
      if (requestId !== requestIdRef.current) {
        return
      }
      const comment: DoorayComment = {
        id: result.id || createBrowserUuid(),
        body: bodyState.body,
        createdAt: new Date().toISOString(),
        authorName: translate(`${K}.you`, 'You')
      }
      optimisticRef.current.push(comment)
      setComments((previous) => [...previous, comment])
      setCommentDraft('')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate(`${K}.comment_failed`, 'Failed to add comment.')
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setCommentSubmitting(false)
      }
    }
  }, [api, commentDraft, commentSubmitting, issueId, projectId])

  return {
    comments,
    commentsLoading,
    commentsError,
    commentDraft,
    setCommentDraft,
    commentSubmitting,
    canSubmitComment: hasBoundedCommentBodyText(commentDraft),
    submitComment,
    retryLoadComments
  }
}
