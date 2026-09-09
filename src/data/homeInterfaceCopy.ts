import type { SiteLanguage } from '../utils/siteLanguage'

interface HomeInterfaceCopy {
  titleAction: string
  status: {
    localTime: string
    portStatus: string
    portValue: string
  }
}

export const homeInterfaceCopy: Record<SiteLanguage, HomeInterfaceCopy> = {
  zh: {
    titleAction: '切换下一条泊岸题句',
    status: {
      localTime: '本地时间',
      portStatus: '入口状态',
      portValue: '入口状态公开可见',
    },
  },
  en: {
    titleAction: 'Switch to the next BIAU Port line',
    status: {
      localTime: 'LOCAL TIME',
      portStatus: 'PORT STATUS',
      portValue: 'Public entry status is visible',
    },
  },
}
