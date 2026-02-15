import { motion } from 'framer-motion'

export default function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{
        enter: { duration: 0.3 },
        exit: { duration: 0.15 },
      }}
    >
      {children}
    </motion.div>
  )
}
