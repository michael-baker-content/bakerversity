'use client'

import BakerversityLogo from '@/components/BakerversityLogo'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import ThemeToggle from './ThemeToggle'

interface SiteNavClientProps {
  active?: 'courses' | 'dashboard' | 'about'
  isSignedIn: boolean
  isAdmin: boolean
}

export default function SiteNavClient({ active, isSignedIn, isAdmin }: SiteNavClientProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on any resize while open
  useEffect(() => {
    const handleResize = () => { if (menuOpen) setMenuOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [menuOpen])

  return (
    <>
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 1.25rem',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>

          {/* Group 1 — Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
            <BakerversityLogo size={26} />
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem',
              color: 'var(--text)',
            }}>Bakerversity</span>
          </Link>

          {/* Group 2 — Nav links (desktop only) */}
          <nav className="sitenav-desktop" style={{ display: 'flex', gap: 2 }}>
            <NavLink href="/courses" active={active === 'courses'}>Courses</NavLink>
            <NavLink href="/about" active={active === 'about'}>About</NavLink>
            {isSignedIn && (
              <>
                <NavLink href="/dashboard" active={active === 'dashboard'}>Dashboard</NavLink>
                <NavLink href="/progress">My Progress</NavLink>
                {isAdmin && (
                  <>
                    <NavLink href="/admin/courses">Admin</NavLink>
                    <NavLink href="/admin/certificates">Certificates</NavLink>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Group 3 — Theme + Avatar/Auth + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggle size="sm" />

            <SignedIn>
              <div onClick={() => setMenuOpen(false)}>
                <UserButton
                  afterSignOutUrl="/"
                  userProfileUrl="/profile"
                  userProfileMode="navigation"
                />
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn btn-outline btn-sm sitenav-signin">Sign in</button>
              </SignInButton>
            </SignedOut>

            {/* Hamburger — mobile only */}
            <button
              className="sitenav-hamburger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'transparent',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--text-2)',
                flexShrink: 0,
              }}
            >
              {menuOpen ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" />
                  <line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="3" x2="13" y2="3" />
                  <line x1="1" y1="7" x2="13" y2="7" />
                  <line x1="1" y1="11" x2="13" y2="11" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </header>

      {/* Mobile dropdown — fixed, right half of screen */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu panel */}
          <div style={{
            position: 'fixed',
            top: 52,
            right: 0,
            width: '50%',
            minWidth: 180,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            zIndex: 50,
            boxShadow: 'var(--shadow)',
          }}>
            <MobileLink href="/courses" active={active === 'courses'} onClick={() => setMenuOpen(false)}>
              Courses
            </MobileLink>
            <MobileLink href="/about" active={active === 'about'} onClick={() => setMenuOpen(false)}>
              About
            </MobileLink>
            {isSignedIn && (
              <>
                <MobileLink href="/dashboard" active={active === 'dashboard'} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </MobileLink>
                <MobileLink href="/progress" onClick={() => setMenuOpen(false)}>
                  My Progress
                </MobileLink>
                {isAdmin && (
                  <>
                    <MobileLink href="/admin/courses" onClick={() => setMenuOpen(false)}>
                      Admin
                    </MobileLink>
                    <MobileLink href="/admin/certificates" onClick={() => setMenuOpen(false)}>
                      Certificates
                    </MobileLink>
                  </>
                )}
                <MobileLink href="/profile" onClick={() => setMenuOpen(false)}>
                  Profile
                </MobileLink>
              </>
            )}
            {!isSignedIn && (
              <div style={{ padding: '0.75rem 1rem' }}>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 720px) {
          .sitenav-desktop { display: none !important; }
          .sitenav-hamburger { display: flex !important; }
          .sitenav-signin { display: none !important; }
        }
        @media (min-width: 721px) {
          .sitenav-hamburger { display: none !important; }
        }
      `}</style>
    </>
  )
}

function NavLink({ href, active, children }: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link href={href} style={{
      padding: '5px 12px',
      borderRadius: 'var(--radius)',
      fontSize: 14,
      fontWeight: active ? 500 : 400,
      color: active ? 'var(--text)' : 'var(--text-2)',
      background: active ? 'var(--surface-2)' : 'transparent',
      transition: 'background 0.15s, color 0.15s',
      textDecoration: 'none',
    }}>
      {children}
    </Link>
  )
}

function MobileLink({ href, active, onClick, children }: {
  href: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: 'block',
      padding: '12px 1rem',
      fontSize: 14,
      fontWeight: active ? 500 : 400,
      color: active ? 'var(--text)' : 'var(--text-2)',
      borderBottom: '1px solid var(--border)',
      textDecoration: 'none',
      textAlign: 'right',
    }}>
      {children}
    </Link>
  )
}
