import { motion } from 'motion/react'
import { tokens } from '../designTokens'

interface DetailEmptyStateProps {
  icon: React.ReactNode
  text: string
}

export function DetailEmptyState({ icon, text }: DetailEmptyStateProps) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex items-center justify-center h-full"
    >
      <div className="text-center">
        <div className="mx-auto mb-3 flex justify-center" style={{ color: tokens.colors.textQuaternary }}>
          {icon}
        </div>
        <p className="text-[13px]" style={{ color: tokens.colors.textTertiary }}>{text}</p>
      </div>
    </motion.div>
  )
}
