import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { IS_COMMUNITY_MODE } from '@/constants'
import { useRelayAccess } from '@/hooks/useRelayAccess'
import { useNostr } from '@/providers/NostrProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function RelayAccessBanner() {
  const { pubkey } = useNostr()
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()
  const { state, requestAccess, communityRelayUrl } = useRelayAccess()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Only active in community mode with a logged-in user
  if (!IS_COMMUNITY_MODE || !pubkey) return null

  // Auto-open when access is denied; auto-show toast for pending state
  useEffect(() => {
    if (state === 'denied') {
      setOpen(true)
    } else if (state === 'pending-request') {
      setOpen(false)
      showPendingToast()
    }
  }, [state])

  const showPendingToast = () => {
    toast.info(t('Access request pending — awaiting admin approval'), {
      duration: Infinity,
      id: 'relay-access-pending',
      action: {
        label: t('View status'),
        onClick: () => window.open(`https://${new URL('wss://' + communityRelayUrl?.replace(/^wss?:\/\//, '')).hostname}`, '_blank')
      }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await requestAccess(note)
      setOpen(false)
      setNote('')
      showPendingToast()
    } catch (err) {
      toast.error(t('Failed to send access request') + ': ' + (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setOpen(false)
  }

  const relayHost = communityRelayUrl
    ? new URL('wss://' + communityRelayUrl.replace(/^wss?:\/\//, '')).hostname
    : 'the relay'

  const title = t('Join {{relay}}', { relay: relayHost })
  const description = t(
    'This community relay requires membership to post. Submit a short note to request access from an admin.'
  )

  const formContent = (
    <Textarea
      placeholder={t('Introduce yourself... (optional)')}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      maxLength={280}
      rows={3}
      className="resize-none"
    />
  )

  if (isSmallScreen) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">{formContent}</div>
          <DrawerFooter className="pt-2">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Request Access')}
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              {t('Skip for now')}
            </Button>
            <a
              href={`https://${relayHost}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {t('View invite tree at {{host}}', { host: relayHost })}
            </a>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-2">{formContent}</div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <a
            href={`https://${relayHost}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            {t('View invite tree')}
          </a>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              {t('Skip for now')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Request Access')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
