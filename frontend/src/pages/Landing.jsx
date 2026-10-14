import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  FileText,
  FolderOpen,
  Mail,
  Paperclip,
  Search,
  Sparkles,
  Tags
} from "lucide-react";
import {
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube
} from "react-icons/fa6";
import ThemeSwitcher from "../components/ThemeSwitcher";
import "./Landing.css";

const features = [
  {
    icon: FileText,
    number: "01",
    title: "Capture your thoughts",
    description:
      "Create beautifully formatted notes for your ideas, learning, projects, and everyday discoveries."
  },
  {
    icon: FolderOpen,
    number: "02",
    title: "Build your own library",
    description:
      "Organize information with folders and categories so everything has a place of its own."
  },
  {
    icon: Bookmark,
    number: "03",
    title: "Save what matters",
    description:
      "Keep important web resources and references together with your personal knowledge."
  },
  {
    icon: Tags,
    number: "04",
    title: "Connect your ideas",
    description:
      "Use tags to group related notes and discover information across different topics."
  },
  {
    icon: Paperclip,
    number: "05",
    title: "Keep resources close",
    description:
      "Attach useful documents to your notes instead of scattering your learning materials."
  },
  {
    icon: Search,
    number: "06",
    title: "Find information faster",
    description:
      "Bring your notes, saved resources, and ideas into one workspace you can return to."
  }
];

const socialLinks = [
  {
    label: "LinkedIn",
    icon: FaLinkedinIn,
    href: "https://www.linkedin.com/"
  },
  {
    label: "GitHub",
    icon: FaGithub,
    href: "https://github.com/"
  },
  {
    label: "Instagram",
    icon: FaInstagram,
    href: "https://www.instagram.com/"
  },
  {
    label: "YouTube",
    icon: FaYoutube,
    href: "https://www.youtube.com/"
  },
  {
    label: "Email",
    icon: Mail,
    href: "mailto:"
  }
];

const steps = [
  {
    number: "01",
    title: "Capture",
    description:
      "Write down ideas, record what you learn, and save the resources worth remembering."
  },
  {
    number: "02",
    title: "Organize",
    description:
      "Bring related notes together using folders, categories, bookmarks, and tags."
  },
  {
    number: "03",
    title: "Rediscover",
    description:
      "Return to your growing collection whenever you need an idea, reference, or reminder."
  }
];

function Landing() {
  const hasToken = Boolean(localStorage.getItem("token"));
  const startLink = hasToken ? "/dashboard" : "/register";

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link
          to="/"
          className="landing-brand"
          aria-label="Knowledgebase home"
        >
          <span className="landing-brand-mark">
            <BookOpen size={23} strokeWidth={2.2} />
          </span>

          <span className="landing-brand-name">
            Knowledge<span>base</span>
          </span>
        </Link>

        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>

        <div className="landing-header-actions">
          <ThemeSwitcher compact />

          <Link
            to={hasToken ? "/dashboard" : "/login"}
            className="landing-login"
          >
            Log in
          </Link>

          <Link
            to={startLink}
            className="landing-header-cta"
          >
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <Sparkles size={15} />
            <span>Your personal space for knowledge</span>
          </div>

          <h1>
            Everything worth
            <br />
            knowing, <span>all in one place.</span>
          </h1>

          <p className="landing-hero-description">
            Your ideas deserve more than scattered notes and forgotten
            bookmarks. Capture what you learn, organize what matters, and
            build a personal knowledge library that grows with you.
          </p>

          <div className="landing-hero-actions">
            <Link
              to={startLink}
              className="landing-primary-button"
            >
              Build your knowledge base
              <ArrowRight size={18} />
            </Link>

            <a
              href="#features"
              className="landing-secondary-button"
            >
              Explore features
            </a>
          </div>

          <div className="landing-hero-trust">
            <div className="landing-trust-icon">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Notes, resources, and ideas. Organized your way.
            </span>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />

          <div className="landing-preview">
            <div className="landing-preview-topbar">
              <div className="landing-preview-brand">
                <span className="landing-preview-brand-icon">
                  <BookOpen size={15} />
                </span>

                <span>My knowledge</span>
              </div>

              <div className="landing-preview-avatar">M</div>
            </div>

            <div className="landing-preview-body">
              <div className="landing-preview-greeting">
                <span>YOUR WORKSPACE</span>

                <h3>A little space to think.</h3>

                <p>
                  Keep the things you want to remember.
                </p>
              </div>

              <div className="landing-preview-stats">
                <div className="landing-preview-stat">
                  <span className="landing-preview-stat-icon note-color">
                    <FileText size={17} />
                  </span>

                  <div>
                    <strong>Notes</strong>
                    <span>Your thoughts</span>
                  </div>
                </div>

                <div className="landing-preview-stat">
                  <span className="landing-preview-stat-icon folder-color">
                    <FolderOpen size={17} />
                  </span>

                  <div>
                    <strong>Collections</strong>
                    <span>Your topics</span>
                  </div>
                </div>
              </div>

              <div className="landing-preview-section-heading">
                <span>Recently captured</span>
                <span className="landing-preview-dot" />
              </div>

              <div className="landing-preview-note">
                <div className="landing-preview-note-icon">
                  <Sparkles size={17} />
                </div>

                <div className="landing-preview-note-copy">
                  <strong>Ideas worth exploring</strong>

                  <span>
                    Personal notes · Updated recently
                  </span>

                  <div className="landing-preview-tags">
                    <span>Ideas</span>
                    <span>Learning</span>
                  </div>
                </div>
              </div>

              <div className="landing-preview-note">
                <div className="landing-preview-note-icon bookmark-color">
                  <Bookmark size={17} />
                </div>

                <div className="landing-preview-note-copy">
                  <strong>Useful resources</strong>

                  <span>
                    Saved references · Your library
                  </span>

                  <div className="landing-preview-tags">
                    <span>Resources</span>
                  </div>
                </div>
              </div>

              <div className="landing-preview-search">
                <Search size={15} />

                <span>
                  Your next idea is only a search away...
                </span>
              </div>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-top">
            <span className="landing-floating-icon">
              <Bookmark size={17} />
            </span>

            <div>
              <strong>Save the good stuff</strong>
              <span>Never lose a useful resource</span>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-bottom">
            <span className="landing-floating-icon green">
              <Tags size={17} />
            </span>

            <div>
              <strong>Everything connected</strong>
              <span>Ideas, organized your way</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-principles" id="about">
        <div className="landing-principle">
          <span className="landing-principle-number">01</span>

          <div>
            <strong>Less scattered thinking</strong>
            <p>Bring your notes and resources together.</p>
          </div>
        </div>

        <div className="landing-principle">
          <span className="landing-principle-number">02</span>

          <div>
            <strong>More intentional learning</strong>
            <p>Build a library around what interests you.</p>
          </div>
        </div>

        <div className="landing-principle">
          <span className="landing-principle-number">03</span>

          <div>
            <strong>Knowledge that stays useful</strong>
            <p>Make it easier to find what you already know.</p>
          </div>
        </div>
      </section>

      <section
        className="landing-features section-container"
        id="features"
      >
        <div className="landing-section-heading">
          <div className="landing-eyebrow">
            <span className="landing-eyebrow-line" />
            A workspace that works for you
          </div>

          <h2>
            A home for all the things
            <br />
            <span>you don't want to forget.</span>
          </h2>

          <p>
            Keep your personal knowledge organized without turning
            organization itself into another task.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                className="landing-feature-card"
                key={feature.number}
              >
                <div className="landing-feature-card-top">
                  <span className="landing-feature-icon">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>

                  <span className="landing-feature-number">
                    {feature.number}
                  </span>
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>

                <div className="landing-feature-card-line" />
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="landing-workflow"
        id="how-it-works"
      >
        <div className="landing-workflow-inner">
          <div className="landing-workflow-heading">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-line" />
              Simple by design
            </div>

            <h2>
              A calmer way to
              <br />
              <span>manage what you know.</span>
            </h2>

            <p>
              Your system should support your thinking, not get in its way.
              Start small and let your library grow naturally.
            </p>

            <Link
              to={startLink}
              className="landing-text-link"
            >
              Start building your library
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="landing-workflow-steps">
            {steps.map((step, index) => (
              <article
                className="landing-workflow-step"
                key={step.number}
              >
                <div className="landing-step-number">
                  {step.number}
                </div>

                <div className="landing-step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className="landing-step-connector" />
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-decoration landing-cta-decoration-one" />
        <div className="landing-cta-decoration landing-cta-decoration-two" />

        <div className="landing-cta-content">
          <span className="landing-cta-icon">
            <BookOpen size={24} />
          </span>

          <span className="landing-cta-eyebrow">
            YOUR KNOWLEDGE, YOUR WAY
          </span>

          <h2>
            Make room for
            <br />
            <span>your next big idea.</span>
          </h2>

          <p>
            Start building a personal library for your thoughts,
            discoveries, and everything you want to keep.
          </p>

          <Link
            to={startLink}
            className="landing-cta-button"
          >
            Get started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-about">
            <Link to="/" className="landing-brand">
              <span className="landing-brand-mark">
                <BookOpen size={21} />
              </span>

              <span className="landing-brand-name">
                Knowledge<span>base</span>
              </span>
            </Link>

            <p>
              A thoughtful space for your notes, ideas, and the knowledge
              you're collecting along the way.
            </p>

            <div className="landing-socials">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    title={social.label}
                    target={social.label === "Email" ? undefined : "_blank"}
                    rel={social.label === "Email" ? undefined : "noreferrer"}
                    className="landing-social-link"
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="landing-footer-column">
            <h3>Explore</h3>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link to="/login">Log in</Link>
            <Link to="/register">Create an account</Link>
          </div>

          <div className="landing-footer-column">
            <h3>Your workspace</h3>
            <a href="#features">Notes & ideas</a>
            <a href="#features">Folders & collections</a>
            <a href="#features">Bookmarks & resources</a>
            <a href="#features">Tags & attachments</a>
          </div>

          <div className="landing-footer-column">
            <h3>Legal</h3>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/cookies">Cookie Policy</Link>
            <a href="mailto:">Contact</a>
          </div>

          <div className="landing-footer-note">
            <span className="landing-footer-note-icon">
              <Sparkles size={18} />
            </span>

            <h3>Keep what matters.</h3>

            <p>
              A growing collection of things you've learned, ideas
              you've had, and resources worth revisiting.
            </p>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} Knowledgebase
          </span>

          <span className="landing-footer-made">
            Made for curious minds
            <Sparkles size={14} />
          </span>
        </div>
      </footer>
    </main>
  );
}

export default Landing;