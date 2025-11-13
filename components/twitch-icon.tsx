import type { SVGProps } from "react"

export function TwitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {/* Purple badge background */}
      <rect width="24" height="24" rx="4" fill="#9147FF" />
      {/* White Twitch logo */}
      <path
        d="M18.5 4.5H5.5v12h3.75v3l3-3h3.75l3-3v-9zm-7.5 6.75V8.25m3.75 3v-3"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
