import { tokens } from '../designTokens'

interface TwoPanelLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
  /** Hide left panel on mobile when an item is selected */
  hideLeftOnMobile?: boolean
}

export function TwoPanelLayout({ left, right, hideLeftOnMobile = false }: TwoPanelLayoutProps) {
  return (
    <div
      className="flex flex-col md:flex-row"
      style={{ height: 'calc(100vh - 48px)', background: tokens.colors.bg }}
    >
      {/* Left Panel */}
      <div
        className={`shrink-0 flex flex-col w-full md:w-[40%] md:max-w-[480px] ${hideLeftOnMobile ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '1px solid ' + tokens.colors.borderSubtle, height: '100%' }}
      >
        {left}
      </div>

      {/* Right Panel */}
      <div className="hidden md:flex flex-1 min-w-0 flex-col">
        {right}
      </div>
    </div>
  )
}
