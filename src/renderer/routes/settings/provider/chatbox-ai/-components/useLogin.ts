import { useQuery } from '@tanstack/react-query'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { checkLoginStatus, getChatboxOrigin, requestLoginTicketId } from '@/packages/remote'
import platform from '@/platform'
import { LOGIN_POLLING_INTERVAL, LOGIN_POLLING_TIMEOUT } from './constants'
import type { LoginState } from './types'

interface UseLoginParams {
  language: string
  onLoginSuccess: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>
}

export const getLanguagePath = (language: string) => {
  return language === 'zh-Hans' || language === 'zh-Hant' ? 'zh' : language.toLowerCase()
}

export async function startChatboxLoginFlow(
  language: string,
  options?: {
    openInBrowser?: boolean
  }
): Promise<{ loginUrl: string; ticketId: string }> {
  const ticketId = await requestLoginTicketId()
  const loginUrl = `${getChatboxOrigin()}/${getLanguagePath(language)}/authorize?ticket_id=${ticketId}`

  if (options?.openInBrowser) {
    console.log('Opening browser for login:', loginUrl)
    await platform.openLink(loginUrl)
  }

  return { loginUrl, ticketId }
}

export function useLogin({ language, onLoginSuccess }: UseLoginParams) {
  const { t } = useTranslation()

  const [loginState, setLoginState] = useState<LoginState>('idle')
  const [ticketId, setTicketId] = useState<string>('')
  const [loginError, setLoginError] = useState<string>('')
  const pollingStartTime = useRef<number>(0)
  const loginSuccessHandled = useRef<boolean>(false)
  const [loginUrl, setLoginUrl] = useState<string>('')

  const _handleLogin = useCallback(async () => {
    try {
      setLoginState('requesting')
      setLoginError('')
      loginSuccessHandled.current = false

      const { ticketId: ticket, loginUrl: url } = await startChatboxLoginFlow(language, {
        openInBrowser: platform.type !== 'web',
      })
      setTicketId(ticket)
      setLoginUrl(url)

      setLoginState('polling')
      pollingStartTime.current = Date.now()
    } catch (error: any) {
      console.error('Failed to request login ticket:', error)
      setLoginError(error?.message || 'Failed to start login process')
      setLoginState('error')
    }
  }, [language, setLoginState])

  const handleLogin = useMemo(() => debounce(_handleLogin, 500, { leading: true, trailing: false }), [_handleLogin])

  const { data: loginStatus, refetch } = useQuery({
    queryKey: ['login-status', ticketId],
    queryFn: async () => {
      return await checkLoginStatus(ticketId)
    },
    enabled: loginState === 'polling' && !!ticketId,
    refetchInterval: LOGIN_POLLING_INTERVAL,
    refetchIntervalInBackground: true, // 后台也继续轮询
    retry: false,
  })

  // 移动端从后台回到前台立即检查登录状态
  useEffect(() => {
    if (platform.type !== 'mobile' || loginState !== 'polling') {
      return
    }

    let listener: any
    const setupListener = async () => {
      try {
        const { App } = await import('@capacitor/app')
        listener = await App.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (state.isActive && loginState === 'polling') {
            // console.log('📱 App returned to foreground, checking login status...')
            refetch()
          }
        })
      } catch (error) {
        console.warn('Failed to setup app state listener:', error)
      }
    }

    setupListener()

    return () => {
      if (listener) {
        listener.remove()
      }
    }
  }, [loginState, refetch])

  useEffect(() => {
    if (loginStatus && loginState === 'polling') {
      if (loginStatus.status === 'success') {
        if (!loginStatus.accessToken || !loginStatus.refreshToken) {
          console.error('❌ Login success but tokens missing!')
          setLoginError(t('Login successful but tokens not received from server') || 'Unknown error')
          setLoginState('error')
          return
        }

        // Prevent duplicate processing
        if (loginSuccessHandled.current) {
          return
        }
        loginSuccessHandled.current = true

        if (platform.type === 'mobile') {
          import('@capacitor/browser')
            .then(({ Browser }) => {
              Browser.close()
            })
            .catch((error) => {
              console.warn('Failed to close browser:', error)
            })
        }

        setLoginState('success')

        onLoginSuccess({
          accessToken: loginStatus.accessToken,
          refreshToken: loginStatus.refreshToken,
        }).catch((error) => {
          console.error('❌ Failed to save tokens:', error)
          setLoginError(t('Failed to save login tokens') || 'Unknown error')
          setLoginState('error')
        })
      } else if (loginStatus.status === 'rejected') {
        setLoginError(t('Authorization was rejected. Please try again if you want to login.') || 'Unknown error')
        setLoginState('error')
        setTicketId('')
      }
    }
  }, [loginStatus, loginState, setLoginState, onLoginSuccess])

  useEffect(() => {
    if (loginState === 'polling') {
      const checkTimeout = setInterval(() => {
        const elapsed = Date.now() - pollingStartTime.current
        if (elapsed > LOGIN_POLLING_TIMEOUT) {
          setLoginError(t('Login timeout. Please try again.') || '')
          setLoginState('timeout')
          setTicketId('')
        }
      }, 1000)

      return () => clearInterval(checkTimeout)
    }
  }, [loginState, setLoginState])

  return {
    handleLogin,
    loginError,
    loginUrl,
    loginState,
  }
}
