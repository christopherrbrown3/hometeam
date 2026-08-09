import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HomeMark } from '../../../components/ui/HomeMark'
import { Icon } from '../../../components/ui/Icon'
import { TaskIcon } from '../../categories/TaskIcon'
import type { AssigneeColor } from '../../profiles/profileColors'

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}

type PreviewTaskProps = Readonly<{
  assignee: string
  assigneeColor: AssigneeColor
  categoryName: string
  time: string
  title: string
}>

function PreviewTask({ assignee, assigneeColor, categoryName, time, title }: PreviewTaskProps) {
  return (
    <div className="login-preview-task">
      <TaskIcon assigneeColor={assigneeColor} categoryName={categoryName} size="lg" />
      <span className="login-preview-task-copy">
        <strong>{title}</strong>
        <span>{time}</span>
      </span>
      <span className="login-preview-assignee" data-assignee-color={assigneeColor}>
        <span aria-hidden="true" className="login-preview-assignee-dot" />
        {assignee}
      </span>
    </div>
  )
}

function ProductPreview() {
  return (
    <figure aria-labelledby="login-product-preview-title" className="login-product-preview">
      <figcaption className="login-preview-caption" id="login-product-preview-title">
        <span>Product preview · Example household</span>
        <span className="login-preview-sync"><span aria-hidden="true" /> Synced</span>
      </figcaption>
      <div className="login-preview-surface">
        <div className="login-preview-header">
          <span>
            <small>Maple Street</small>
            <strong>Today</strong>
          </span>
          <span aria-hidden="true" className="login-preview-people">
            <span data-profile-color="blue">C</span>
            <span data-profile-color="pink">I</span>
          </span>
        </div>

        <div className="login-preview-group">
          <div className="login-preview-group-heading">
            <span>Overdue</span>
            <span>1</span>
          </div>
          <PreviewTask assignee="Chris" assigneeColor="blue" categoryName="Recycling" time="8:00 AM" title="Take bins out" />
        </div>

        <div className="login-preview-group">
          <div className="login-preview-group-heading login-preview-group-heading--now">
            <span>Due now</span>
            <span>1</span>
          </div>
          <PreviewTask assignee="inkimidator" assigneeColor="pink" categoryName="Pets" time="Now · every day" title="Give Milo dinner" />
          <div aria-label="Available actions: Complete, Snooze, or Skip" className="login-preview-actions">
            <span className="login-preview-action login-preview-action--primary"><Icon name="check" size={15} weight="bold" /> Complete</span>
            <span className="login-preview-action"><Icon name="clock" size={15} /> Snooze</span>
            <span className="login-preview-action">Skip</span>
          </div>
        </div>

        <div className="login-preview-group">
          <div className="login-preview-group-heading login-preview-group-heading--later">
            <span>Later today</span>
            <span>1</span>
          </div>
          <PreviewTask assignee="Unassigned" assigneeColor="unassigned" categoryName="Plants" time="6:00 PM" title="Water the herbs" />
        </div>
      </div>
    </figure>
  )
}

function AssignmentPreview() {
  return (
    <div aria-label="Example round-robin assignment" className="login-assignment-preview">
      <div className="login-assignment-preview-header">
        <span>
          <small>Assignment</small>
          <strong>Kitchen reset</strong>
        </span>
        <span className="login-assignment-rule"><Icon name="activity" size={16} /> Round robin</span>
      </div>
      <div className="login-assignment-route">
        <div className="login-assignment-person" data-profile-color="blue">
          <span>C</span>
          <strong>Chris</strong>
          <small>Last turn</small>
        </div>
        <Icon className="login-assignment-arrow" name="chevron-right" size={20} />
        <div className="login-assignment-person login-assignment-person--next" data-profile-color="pink">
          <span>I</span>
          <strong>inkimidator</strong>
          <small>Up next</small>
        </div>
        <Icon className="login-assignment-arrow" name="chevron-right" size={20} />
        <div className="login-assignment-person" data-profile-color="blue">
          <span>C</span>
          <strong>Chris</strong>
          <small>Then</small>
        </div>
      </div>
      <p><Icon name="check" size={17} weight="bold" /> The next occurrence is assigned automatically when this one is complete.</p>
    </div>
  )
}

function HistoryPreview() {
  return (
    <div aria-label="Example household history" className="login-history-preview">
      <div className="login-history-preview-header">
        <span>
          <small>Shared history</small>
          <strong>Everyone sees the same story.</strong>
        </span>
        <Icon name="activity" size={22} weight="duotone" />
      </div>
      <ol className="login-history-list">
        <li>
          <span className="login-history-mark login-history-mark--complete"><Icon name="check" size={14} weight="bold" /></span>
          <span><strong>Chris completed Take bins out</strong><small>Today at 8:14 AM</small></span>
        </li>
        <li>
          <span className="login-history-mark"><Icon name="clock" size={14} /></span>
          <span><strong>inkimidator snoozed Give Milo dinner</strong><small>Today at 5:42 PM · for 30 minutes</small></span>
        </li>
        <li>
          <span className="login-history-mark"><Icon name="users" size={14} /></span>
          <span><strong>Kitchen reset rotated to inkimidator</strong><small>Yesterday at 9:03 PM</small></span>
        </li>
      </ol>
    </div>
  )
}

export function LoginPortfolioFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="login-portfolio">
      <section className="login-stage">
        <header className="login-public-header">
          <Link aria-label="HomeTeam sign in" className="login-brand" to="/login">
            <HomeMark className="text-brand" size={40} />
            <span><strong>HomeTeam</strong><small>Tasks, together.</small></span>
          </Link>
          <nav aria-label="Public navigation" className="login-public-nav">
            <button onClick={() => scrollToSection('how-it-works')} type="button">How it works</button>
            <button onClick={() => scrollToSection('built-with')} type="button">Under the hood</button>
            <Link aria-label="Create account" className="login-public-cta" to="/register"><span aria-hidden="true" className="login-public-cta-full">Create account</span><span aria-hidden="true" className="login-public-cta-short">Create</span><Icon name="chevron-right" size={16} weight="bold" /></Link>
          </nav>
        </header>

        <div className="login-hero">
          <section aria-label="HomeTeam overview" className="login-hero-copy">
            <p className="login-kicker"><span aria-hidden="true" /> The shared household command center</p>
            <p className="login-display">Nobody has to keep the whole house in their head.</p>
          </section>
          <div className="login-hero-details">
            <p className="login-lede">HomeTeam turns chores, care routines, and shared errands into one trustworthy schedule—with clear owners, fair rotation, and a history everyone can follow.</p>
            <div aria-label="Core capabilities" className="login-capability-line">
              <span><Icon name="calendar" size={17} weight="duotone" /> Flexible schedules</span>
              <span><Icon name="users" size={17} weight="duotone" /> Clear ownership</span>
              <span><Icon name="activity" size={17} weight="duotone" /> Live shared history</span>
            </div>
          </div>

          <section aria-labelledby="auth-page-title" className="login-auth-card">{children}</section>
          <ProductPreview />
        </div>
      </section>

      <section className="login-story" id="how-it-works">
        <div className="login-story-heading">
          <p className="login-section-kicker">Made for the way home actually works</p>
          <h2>From “someone should” to handled.</h2>
          <p>Set the routine once. HomeTeam keeps each occurrence clear, current, and connected to the people sharing the work.</p>
        </div>
        <ol className="login-story-steps">
          <li>
            <span className="login-step-number">01</span>
            <div><h3>Schedule it your way.</h3><p>One-time, weekly, monthly, or after completion—with all-day tasks and precise time windows.</p></div>
          </li>
          <li>
            <span className="login-step-number">02</span>
            <div><h3>Make ownership obvious.</h3><p>Assign it, leave it open to claim, or rotate it fairly through the household.</p></div>
          </li>
          <li>
            <span className="login-step-number">03</span>
            <div><h3>Adapt without losing context.</h3><p>Complete, snooze, skip, undo, and pause—while a durable history keeps everyone aligned.</p></div>
          </li>
        </ol>
      </section>

      <section className="login-ownership-section">
        <div className="login-section-copy">
          <p className="login-section-kicker">Clear ownership, less negotiation</p>
          <h2>Everyone can see whose turn it is.</h2>
          <p>Personal colors make assignments legible at a glance. Fixed tasks stay fixed, open tasks can be claimed, and round robin moves recurring work forward automatically.</p>
          <div className="login-inline-proof">
            <span data-profile-color="blue"><i aria-hidden="true" /> Chris</span>
            <span data-profile-color="pink"><i aria-hidden="true" /> inkimidator</span>
            <span data-profile-color="unassigned"><i aria-hidden="true" /> Unassigned</span>
          </div>
        </div>
        <AssignmentPreview />
      </section>

      <section className="login-history-section">
        <HistoryPreview />
        <div className="login-section-copy login-section-copy--light">
          <p className="login-section-kicker">Plans change. The story stays clear.</p>
          <h2>A shared record, not a blame game.</h2>
          <p>Realtime updates keep every device in sync, while completion, snoozes, skips, reassignment, and undo remain visible in one trustworthy timeline.</p>
        </div>
      </section>

      <section className="login-build-section" id="built-with">
        <div className="login-build-heading">
          <p className="login-section-kicker">Built like a real product</p>
          <h2>Small footprint. Production-minded foundations.</h2>
          <p>A mobile-first React and TypeScript PWA backed by Supabase, transactional workflows, realtime sync, and row-level security.</p>
        </div>
        <ul className="login-build-list">
          <li><Icon name="spark" size={20} weight="duotone" /><span><strong>Installable PWA</strong><small>Fast, focused, and at home on any screen.</small></span></li>
          <li><Icon name="activity" size={20} weight="duotone" /><span><strong>Realtime by default</strong><small>One authoritative occurrence across devices.</small></span></li>
          <li><Icon name="lock" size={20} weight="duotone" /><span><strong>Household boundaries</strong><small>Roles, revocable invites, and row-level security.</small></span></li>
        </ul>
        <a className="login-source-link" href="https://github.com/christopherrbrown3/hometeam" rel="noreferrer" target="_blank">View the source on GitHub <Icon name="chevron-right" size={17} weight="bold" /></a>
      </section>

      <footer className="login-footer">
        <span><HomeMark className="text-brand" size={30} /> <strong>HomeTeam</strong></span>
        <p>Shared work, without the mental load.</p>
        <Link to="/register">Create an account <Icon name="chevron-right" size={15} /></Link>
      </footer>
    </main>
  )
}
