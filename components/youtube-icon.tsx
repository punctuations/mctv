import type { SVGProps } from "react"

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {/* Red badge background */}
      <rect width="24" height="24" rx="4" fill="#FF0000" />
      {/* White YouTube logo */}
      <path
        d="M19.615 7.154A2.262 2.262 0 0 0 18.03 5.58C16.672 5.25 12 5.25 12 5.25s-4.672 0-6.03.33a2.262 2.262 0 0 0-1.585 1.574C4 8.506 4 11.25 4 11.25s0 2.744.385 4.096a2.262 2.262 0 0 0 1.585 1.574c1.358.33 6.03.33 6.03.33s4.672 0 6.03-.33a2.262 2.262 0 0 0 1.585-1.574C20 13.994 20 11.25 20 11.25s0-2.744-.385-4.096zM10.454 13.932V8.568L14.909 11.25l-4.455 2.682z"
        fill="white"
      />
    </svg>
  )
}
