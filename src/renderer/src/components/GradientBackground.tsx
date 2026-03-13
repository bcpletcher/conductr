export default function GradientBackground(): React.JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        background: '#080c20',
        pointerEvents: 'none',
      }}
    >
      {/* Wallpaper image — gradient SVG below acts as fallback */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(./wallpaper.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.55,
        }}
      />
      {/* Dark overlay to preserve readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 12, 32, 0.45)',
        }}
      />
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="mesh-a" x="-120%" y="-120%" width="340%" height="340%">
            <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="4" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="90" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation="130" />
          </filter>
          <filter id="mesh-b" x="-120%" y="-120%" width="340%" height="340%">
            <feTurbulence type="turbulence" baseFrequency="0.010" numOctaves="3" seed="19" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="80" xChannelSelector="G" yChannelSelector="R" result="d" />
            <feGaussianBlur in="d" stdDeviation="140" />
          </filter>
        </defs>

        {/* Purple — upper-left, centered enough to wash across top row */}
        <ellipse
          cx="480" cy="60"
          rx="560" ry="420"
          fill="rgba(90, 20, 190, 0.22)"
          filter="url(#mesh-a)"
        />

        {/* Blue — lower-right, centered enough to wash across bottom cards evenly */}
        <ellipse
          cx="1020" cy="820"
          rx="560" ry="420"
          fill="rgba(25, 60, 200, 0.20)"
          filter="url(#mesh-b)"
        />
      </svg>
    </div>
  )
}
