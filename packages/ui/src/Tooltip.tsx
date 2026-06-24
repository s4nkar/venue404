import React from 'react'
import { Info } from 'lucide-react'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[320px] px-3 py-1.5 bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs font-normal leading-relaxed text-justify rounded-md shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 whitespace-normal">
        {content}
        {/* Sleek rotated square for the arrow pointer */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-700 border-b border-r border-zinc-600 rotate-45"></div>
      </div>
    </div>
  )
}

export function InfoTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip content={content}>
      <div className="cursor-help ml-1 inline-flex">
        <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 transition-colors" />
      </div>
    </Tooltip>
  )
}
