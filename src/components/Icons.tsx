interface IconProps {
  size?: number
  color?: string
  className?: string
}

const d = (props: IconProps) => ({ width: props.size ?? 20, height: props.size ?? 20, viewBox: '0 0 24 24', fill: 'none', stroke: props.color ?? 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: props.className })

export const IconChevronRight = (p: IconProps) => <svg {...d(p)}><path d="M9 18l6-6-6-6"/></svg>
export const IconChevronLeft  = (p: IconProps) => <svg {...d(p)}><path d="M15 18l-6-6 6-6"/></svg>
export const IconX            = (p: IconProps) => <svg {...d(p)}><path d="M18 6L6 18M6 6l12 12"/></svg>
export const IconBook         = (p: IconProps) => <svg {...d(p)}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
export const IconBarChart     = (p: IconProps) => <svg {...d(p)}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
export const IconFlame        = (p: IconProps) => <svg {...d(p)}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>
export const IconCheck        = (p: IconProps) => <svg {...d(p)}><path d="M20 6L9 17l-5-5"/></svg>
export const IconClipboard    = (p: IconProps) => <svg {...d(p)}><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/></svg>
export const IconGraduate     = (p: IconProps) => <svg {...d(p)}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
export const IconLogOut       = (p: IconProps) => <svg {...d(p)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
export const IconFilter       = (p: IconProps) => <svg {...d(p)}><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>
export const IconTarget       = (p: IconProps) => <svg {...d(p)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
export const IconArrowRight   = (p: IconProps) => <svg {...d(p)}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
export const IconTrophy       = (p: IconProps) => <svg {...d(p)}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>
export const IconStar         = (p: IconProps) => <svg {...d(p)}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
export const IconLightbulb    = (p: IconProps) => <svg {...d(p)}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>
