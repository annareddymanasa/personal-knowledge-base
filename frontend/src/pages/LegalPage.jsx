import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Mail
} from "lucide-react";
import "./LegalPage.css";

const SUPPORT_EMAIL = "annareddymanasa438@gmail.com";

const policies = {
  privacy: {
    eyebrow: "YOUR INFORMATION, YOUR CONTROL",
    title: "Privacy Policy",
    subtitle:
      "Your personal knowledge belongs to you. This policy explains how Knowledgebase handles your information, how it is used, and the choices available to you.",
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          "Welcome to Knowledgebase, a personal knowledge management application designed to help you capture ideas, organize notes, save useful resources, and maintain your own digital library.",
          "This Privacy Policy explains the information processed when you visit the website, create an account, sign in, manage your workspace, upload files, or use other application features.",
          "By using Knowledgebase, you acknowledge that you have had an opportunity to read this policy. Where consent is required by applicable law, the relevant processing will be based on that consent rather than merely on continued use of the website."
        ]
      },
      {
        title: "2. Information We Collect",
        paragraphs: [
          "Account information: When you register, we process information such as your full name, email address, and password hash. Passwords are intended to be stored as hashes rather than as readable passwords.",
          "Google authentication information: If you sign in using Google through Firebase Authentication, we receive identity information needed to authenticate you and associate your Google identity with your Knowledgebase account.",
          "Notes and workspace content: We store the notes, formatted text, categories, folders, tags, bookmarks, favorites, and other content you create or save in the application.",
          "Uploaded files: If you attach documents or upload a profile picture, we process information about those files, such as their original filenames, file types, sizes, and storage locations.",
          "Account preferences: The application may store preferences such as your selected theme, default dashboard page, and compact-mode setting.",
          "Activity information: The application may maintain records of actions performed in your workspace to provide the activity dashboard and support troubleshooting or security investigations.",
          "Technical information: The hosting environment and connected services may process technical information required to deliver the application, diagnose failures, protect the service, and maintain normal operation."
        ]
      },
      {
        title: "3. How We Use Your Information",
        paragraphs: [
          "We use account information to register users, authenticate sessions, associate personal content with the correct account, and provide account-management features.",
          "We use your notes, folders, bookmarks, categories, tags, attachments, and profile information to provide the features you request and preserve your workspace between visits.",
          "We use your email address to deliver requested password-reset messages and login-verification codes.",
          "We process authentication information to verify Google sign-ins and protect routes and features that require an authenticated account.",
          "We may use relevant technical and activity records to troubleshoot problems, protect against misuse, investigate security incidents, and maintain the reliability of the application."
        ]
      },
      {
        title: "4. Passwords and Authentication",
        paragraphs: [
          "For email-and-password accounts, Knowledgebase uses password hashing so the application can verify a password without intentionally storing the original password in readable form.",
          "When a user requests a password reset, the application creates a temporary reset token. The current implementation stores a hash of that token and uses an expiration time to limit how long the link remains valid.",
          "During login, the application checks the submitted credentials and sends a one-time verification code to the registered email address. The user must enter the correct code before the backend issues the application's normal authentication token.",
          "Google sign-in is handled through Firebase Authentication. The backend verifies the Firebase identity before associating it with a Knowledgebase account.",
          "You should keep your password, login verification codes, password-reset links, and active session credentials confidential. Anyone who gains access to your email account or active session may be able to compromise your Knowledgebase account."
        ]
      },
      {
        title: "5. How Login Verification Works",
        paragraphs: [
          "When the email-verification login flow is active, a successful first-factor login triggers an email containing a one-time verification code.",
          "The code is intended to expire after a limited period and is subject to failed-attempt restrictions. The verification challenge is temporary and is not intended to act as a normal authenticated session.",
          "The backend should issue the normal application token only after successful verification of the code.",
          "Email verification is an additional account-protection measure, but it does not guarantee that an account cannot be compromised. Protect your registered email account and notify the administrator if you suspect unauthorized access."
        ]
      },
      {
        title: "6. How We Store Information",
        paragraphs: [
          "Knowledgebase uses MySQL to store account records and application content.",
          "The backend may store uploaded attachments and profile pictures in its configured file-storage location. File-storage arrangements may change when the application is hosted or its infrastructure is updated.",
          "Browser local storage is currently used for application-session information and certain preferences. Browser session storage is used for temporary information involved in the email-verification login process.",
          "The use of a particular storage mechanism does not mean that the stored information is automatically backed up or recoverable indefinitely. Users should retain independent copies of important information."
        ]
      },
      {
        title: "7. Service Providers and Third Parties",
        paragraphs: [
          "Knowledgebase uses Firebase Authentication for Google sign-in. Information required to authenticate your Google account is processed through Firebase and the relevant Google services.",
          "The backend uses an email-delivery provider to send password-reset and login-verification messages. When Gmail SMTP is configured, Google processes the email information required to deliver those messages.",
          "Hosting, infrastructure, database, or file-storage providers may process information as necessary to operate the application.",
          "These providers operate under their own applicable terms and privacy policies. Their processing practices are not fully controlled by the Knowledgebase application."
        ]
      },
      {
        title: "8. Disclosure of Information",
        paragraphs: [
          "Knowledgebase does not need to make your private notes or personal library publicly accessible to provide the core features of the application.",
          "Information may be processed by the service providers described in this policy when necessary to provide authentication, email delivery, hosting, storage, or other application functions.",
          "Information may also be disclosed when reasonably necessary to respond to valid legal requirements, protect the rights or security of users, investigate suspected abuse, or maintain the security of the service.",
          "Any additional sharing arrangements introduced in the future should be reflected in an updated version of this policy."
        ]
      },
      {
        title: "9. Cookies and Browser Storage",
        paragraphs: [
          "The current frontend uses browser local storage and session storage for application functionality and preferences. These mechanisms are different from traditional browser cookies, although both can store information on a user's device.",
          "Firebase authentication and other connected services may use additional browser technologies depending on their configuration and operation.",
          "The current project does not intentionally include advertising or analytics integrations. If optional analytics, advertising, or similar tracking technologies are introduced, the application's documentation and applicable consent mechanisms should be updated accordingly.",
          "For more information about these mechanisms, please read the Cookie Policy."
        ]
      },
      {
        title: "10. Data Retention",
        paragraphs: [
          "We retain account information and workspace content for as long as reasonably necessary to provide the application, maintain accounts, support users, and meet applicable operational or legal requirements.",
          "The retention period may vary depending on the type of information, the features being used, and the reason the information was collected.",
          "Password-reset records and login-verification records are intended to be temporary and are subject to expiry or invalidation rules. Technical or security records may be retained for a different period where appropriate.",
          "Backups and security records may not be deleted immediately when individual data is changed or removed."
        ]
      },
      {
        title: "11. Your Rights and Choices",
        paragraphs: [
          "Depending on applicable law, you may have rights relating to access, correction, deletion, or other handling of your personal information.",
          "You can manage some information directly through available profile and workspace settings. You can also contact the administrator to request assistance with account information or data that cannot currently be managed through the interface.",
          "We may need to verify your identity before processing a request. Some information may need to be retained where required by law or reasonably necessary for security and operational purposes.",
          "Clearing browser storage may remove saved preferences or sign you out, but it does not necessarily delete your account or information stored in the backend database."
        ]
      },
      {
        title: "12. Children's Privacy",
        paragraphs: [
          "Knowledgebase is not specifically designed as a service for children. If you believe that a child has provided personal information in circumstances that require its removal or other action, contact the administrator so the matter can be reviewed in accordance with applicable law."
        ]
      },
      {
        title: "13. Security",
        paragraphs: [
          "The application uses security mechanisms that may include password hashing, authenticated backend requests, expiring reset tokens, email-verification challenges, and restrictions on repeated verification attempts.",
          "No software system, internet transmission, authentication method, or storage environment can guarantee absolute security. We cannot promise that unauthorized access, data loss, or technical failures will never occur.",
          "Keep your devices and email account secure, avoid sharing verification codes, and report suspected unauthorized access promptly."
        ]
      },
      {
        title: "14. International Processing",
        paragraphs: [
          "Depending on the hosting environment and service providers configured for the application, information may be processed in locations outside your home jurisdiction.",
          "Before public deployment, the operator should document the actual hosting regions, applicable service arrangements, and any safeguards required for international transfers under relevant law."
        ]
      },
      {
        title: "15. Changes to This Policy",
        paragraphs: [
          "This policy may be updated when the application changes its features, service providers, storage practices, or privacy arrangements.",
          "The latest version will be published on this page with an updated date. Where applicable law requires notice or consent for a material change, the appropriate process should be followed."
        ]
      },
      {
        title: "16. Contact and Privacy Requests",
        paragraphs: [
          "For privacy questions, account-data requests, or concerns about the handling of your information, contact the Knowledgebase administrator using the address below."
        ],
        contact: true
      }
    ]
  },

  terms: {
    eyebrow: "A FEW THINGS TO KNOW",
    title: "Terms & Conditions",
    subtitle:
      "These terms describe the rules for accessing and using Knowledgebase. Please read them carefully before using the application.",
    sections: [
      {
        title: "1. Introduction and Acceptance",
        paragraphs: [
          "Knowledgebase is a personal knowledge management application designed to help users create notes, organize information, maintain bookmarks, upload resources, and manage a personal library of knowledge.",
          "These Terms and Conditions govern your access to and use of the website, account system, and available application features.",
          "By accessing or using the application, you agree to these terms to the extent permitted by applicable law. If you do not agree, you should stop using the service.",
          "If the application is made available through an organization, additional terms or arrangements may apply to that use."
        ]
      },
      {
        title: "2. Eligibility",
        paragraphs: [
          "You must be legally capable of entering into the applicable agreement to use the service. If you are a minor, you should use the service only where permitted by applicable law and with any required parental or guardian involvement.",
          "You must provide accurate information when creating an account and must not impersonate another person or misrepresent your identity."
        ]
      },
      {
        title: "3. Your Account",
        paragraphs: [
          "You are responsible for maintaining the confidentiality of your password, access credentials, registered email account, and login verification codes.",
          "You are responsible for activity performed through your account, except where responsibility is determined otherwise under applicable law.",
          "You should notify the administrator promptly if you believe that someone has accessed your account without authorization.",
          "Do not share active session tokens or verification codes, and do not attempt to bypass login verification."
        ]
      },
      {
        title: "4. Account Registration and Authentication",
        paragraphs: [
          "Accounts may be created using the registration methods made available by the application, including email and password or supported Google authentication.",
          "Google sign-in relies on Firebase Authentication and the relevant Google services. Their services may be subject to separate terms and policies.",
          "The application may send email verification codes during login and password-reset messages during account recovery. You are responsible for maintaining access to the email address associated with your account.",
          "Authentication mechanisms are intended to protect accounts, but no method of authentication eliminates all security risks."
        ]
      },
      {
        title: "5. Acceptable Use",
        paragraphs: [
          "You may use Knowledgebase for lawful personal knowledge management and other uses supported by the application's features.",
          "You must not use the application to violate applicable law, infringe intellectual-property rights, distribute malicious software, harass others, engage in fraud, or store or distribute unlawful material.",
          "You must not attempt to access accounts, files, or data that you are not authorized to access.",
          "You must not interfere with the service, misuse its resources, circumvent its security measures, or attempt to disrupt the availability of the application.",
          "We may investigate suspected misuse and take reasonable action where necessary to protect users, the application, or compliance with applicable law."
        ]
      },
      {
        title: "6. Notes, Files, and User Content",
        paragraphs: [
          "You are responsible for the notes, text, files, bookmarks, tags, and other material you create, upload, or store using the application.",
          "You must have the necessary rights or permissions to use, store, or upload the content you submit.",
          "You retain any rights you already hold in your content. To operate the service, you permit the application to store, process, reproduce, and display that content as reasonably necessary to provide the features you request.",
          "This limited operational permission is not intended to transfer ownership of your content to the application operator.",
          "You should maintain separate copies of important content because technical problems, accidental deletion, account problems, or service changes may affect its availability."
        ]
      },
      {
        title: "7. Intellectual Property",
        paragraphs: [
          "The application's software, branding, visual design, logos, and original interface elements may be protected by intellectual-property laws.",
          "Except where permitted by law or expressly authorized, you must not reproduce, redistribute, sell, or create unauthorized derivative works from protected application material.",
          "These terms do not grant you ownership of the application's source code, trademarks, or other intellectual property merely because you use the service.",
          "You remain responsible for respecting the rights of third parties when using content within your knowledge library."
        ]
      },
      {
        title: "8. Privacy and Data Handling",
        paragraphs: [
          "The collection and handling of personal information are described in the Privacy Policy.",
          "You should review that policy to understand how account data, workspace content, authentication information, and uploaded files are processed.",
          "These terms should be read together with the Privacy Policy and Cookie Policy."
        ]
      },
      {
        title: "9. Third-Party Services",
        paragraphs: [
          "Knowledgebase may depend on third-party services for authentication, email delivery, hosting, database infrastructure, file storage, or other technical functions.",
          "Third-party services are operated independently and may have their own availability, terms, privacy policies, and restrictions.",
          "The application cannot guarantee the uninterrupted operation of external services or control every action taken by their operators."
        ]
      },
      {
        title: "10. Availability, Maintenance, and Changes",
        paragraphs: [
          "Features may be modified, updated, suspended, or discontinued as the application develops.",
          "The service may experience downtime because of maintenance, infrastructure failures, security incidents, or circumstances outside the operator's control.",
          "We do not promise uninterrupted operation, permanent availability of every feature, or permanent retention of all data.",
          "Where appropriate, important changes may be communicated through the website or another available channel."
        ]
      },
      {
        title: "11. Suspension and Termination",
        paragraphs: [
          "You may stop using the application at any time.",
          "Until a self-service account-deletion feature is available, requests to close an account should be directed to the administrator.",
          "Access may be restricted or suspended where reasonably necessary to investigate suspected abuse, address security incidents, protect users, or comply with legal requirements.",
          "Where an account is closed, the handling and retention of associated information will be subject to the Privacy Policy and applicable legal requirements."
        ]
      },
      {
        title: "12. Disclaimers",
        paragraphs: [
          "Knowledgebase is provided on an as-available basis. To the extent permitted by applicable law, we do not guarantee that the application will always be error-free, uninterrupted, compatible with every device, or suitable for every particular purpose.",
          "The application is intended as a knowledge-management tool. You remain responsible for evaluating the accuracy, completeness, and usefulness of information you save or create.",
          "Nothing in these terms excludes a guarantee or right that cannot lawfully be excluded."
        ]
      },
      {
        title: "13. Limitation of Liability",
        paragraphs: [
          "To the extent permitted by applicable law, the operator will not be liable for indirect or consequential losses arising from the use of the application where such liability can lawfully be excluded.",
          "This section does not exclude or restrict liability where doing so would be unlawful, including liability that cannot legally be limited under applicable law.",
          "Nothing in this section removes statutory rights that apply to you."
        ]
      },
      {
        title: "14. Indemnity",
        paragraphs: [
          "To the extent permitted by applicable law, you may be responsible for losses arising from your unlawful use of the service, infringement of another person's rights, or material breach of these terms.",
          "This section does not impose an obligation where applicable law prohibits it."
        ]
      },
      {
        title: "15. Changes to These Terms",
        paragraphs: [
          "These terms may be revised when the service changes or when updates are needed for operational or legal reasons.",
          "The revised version will be published on this page with an updated date. Where required by applicable law, additional notice or agreement will be obtained."
        ]
      },
      {
        title: "16. Governing Law",
        paragraphs: [
          "The law applicable to these terms will depend on the operator's circumstances and the legal requirements relevant to the service. Before public release, the operator should specify an appropriate governing-law and dispute-resolution provision after reviewing the applicable legal obligations."
        ]
      },
      {
        title: "17. Contact",
        paragraphs: [
          "For questions about these terms or problems using the application, contact the Knowledgebase administrator."
        ],
        contact: true
      }
    ]
  },

  cookies: {
    eyebrow: "HOW BROWSER STORAGE WORKS",
    title: "Cookie Policy",
    subtitle:
      "Learn how Knowledgebase uses browser storage and authentication-related technologies to support sign-in, verification, and personalized preferences.",
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          "This Cookie Policy explains how Knowledgebase uses cookies and similar technologies when you visit the website or use the application.",
          "Cookies, local storage, and session storage are different technologies. They can all store information in a browser or on a user's device, but they work differently and may have different lifetimes.",
          "This policy describes the browser-storage mechanisms currently used by the frontend and the considerations relevant to authentication and future optional services."
        ]
      },
      {
        title: "2. What Are Cookies?",
        paragraphs: [
          "Cookies are small pieces of data that a website can ask a browser to store and return with relevant requests. They may support functions such as keeping a user signed in, remembering preferences, measuring site usage, or personalizing an experience.",
          "Cookies may be first-party, set by the website being visited, or third-party, set by another service integrated into that website.",
          "Knowledgebase currently relies on browser local storage and session storage for certain application functions. Those mechanisms should not be described as cookies when they are not implemented as cookies."
        ]
      },
      {
        title: "3. Local Storage",
        paragraphs: [
          "The current application stores the Knowledgebase session token in browser local storage so the frontend can make authenticated requests to the backend.",
          "Local storage is also used to remember certain workspace preferences, including the selected theme and related dashboard settings.",
          "Information in local storage can remain after the browser is closed and reopened. It generally remains until the application or user removes it.",
          "Clearing local storage may sign you out of the application or reset saved preferences. It does not necessarily delete information stored in the backend database."
        ]
      },
      {
        title: "4. Session Storage",
        paragraphs: [
          "Session storage is used to hold temporary information during the login-verification process, including the challenge needed to submit an email OTP.",
          "Session storage is generally scoped to the current browser tab and is cleared when that tab session ends. Its exact behavior can also depend on browser features and user actions.",
          "Temporary challenge information is not the same as a normal application session token. The backend must validate the challenge and OTP before issuing the normal token."
        ]
      },
      {
        title: "5. Authentication and Third-Party Technologies",
        paragraphs: [
          "Google sign-in is implemented using Firebase Authentication. Depending on the provider's configuration, authentication may use browser storage, redirects, popups, or other browser capabilities to complete the sign-in process.",
          "Authentication providers may process technical information required to protect accounts and complete identity verification.",
          "Please review the applicable Google and Firebase documentation for additional information about their services and privacy practices."
        ]
      },
      {
        title: "6. Essential Application Storage",
        paragraphs: [
          "Some browser-storage mechanisms are necessary for core application functions, such as maintaining a signed-in session, submitting protected requests, completing email verification, and remembering preferences that users have selected.",
          "Blocking or clearing essential storage may cause the application to request another sign-in, interrupt a verification flow, or reset preferences.",
          "Essential functionality should be separated from optional analytics or advertising technologies if such technologies are introduced."
        ]
      },
      {
        title: "7. Analytics and Advertising",
        paragraphs: [
          "The current project does not intentionally include advertising or analytics integrations.",
          "If optional analytics, advertising, personalization, or similar tracking technologies are added in the future, the application operator should assess the applicable legal requirements and update the cookie notice and preference controls before activating them where consent is required.",
          "A consent banner should not imply that all types of browser storage are blocked or enabled by consent if the actual implementation behaves differently."
        ]
      },
      {
        title: "8. Managing Your Preferences",
        paragraphs: [
          "You can use your browser's settings and developer tools to inspect or clear site storage. Browser controls vary by product and version.",
          "Clearing site data may remove your local session token and sign you out of Knowledgebase. You may need to sign in again and complete email verification.",
          "Your selected theme and other browser-stored preferences may also be lost when site data is cleared."
        ]
      },
      {
        title: "9. Retention",
        paragraphs: [
          "Local storage may remain on your device until it is cleared or replaced by the application. Session storage is generally temporary and associated with the current tab session.",
          "Information stored in the backend, including account records and workspace content, is subject to the retention arrangements described in the Privacy Policy rather than the lifetime of browser storage.",
          "The retention behavior of third-party authentication technologies is governed partly by the configuration and policies of those providers."
        ]
      },
      {
        title: "10. Updates to This Policy",
        paragraphs: [
          "This policy may be updated when browser-storage practices, authentication integrations, or optional third-party services change.",
          "The latest version will be published on this page with an updated date. Where required, additional notice or user consent will be provided."
        ]
      },
      {
        title: "11. Contact",
        paragraphs: [
          "If you have questions about cookies, local storage, session storage, or this policy, contact the Knowledgebase administrator."
        ],
        contact: true
      }
    ]
  }
};

function LegalPage() {
  const location = useLocation();
  const type = location.pathname.replace(/^\/+|\/+$/g, "");
  const policy = policies[type];

  if (!policy) {
    return (
      <main className="legal-page">
        <div className="legal-not-found">
          <BookOpen size={32} />
          <h1>Page not found</h1>
          <Link to="/">Return to Knowledgebase</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand" aria-label="Knowledgebase home">
          <span className="legal-brand-icon">
            <BookOpen size={22} />
          </span>

          <span className="legal-brand-name">
            Knowledge<span>base</span>
          </span>
        </Link>

        <Link to="/" className="legal-home-link">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>

      <section className="legal-hero">
        <span className="legal-eyebrow">{policy.eyebrow}</span>

        <h1>{policy.title}</h1>

        <p>{policy.subtitle}</p>

        <span className="legal-updated">
          Last updated: 13 October 2026
        </span>
      </section>

      <article className="legal-content">
        {policy.sections.map((section, index) => (
          <section
            key={section.title}
            id={`legal-section-${index}`}
            className="legal-section"
          >
            <h2>{section.title}</h2>

            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${section.title}-${paragraphIndex}`}>
                {paragraph}
              </p>
            ))}

            {section.contact && (
              <a
                className="legal-contact-link"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                <Mail size={17} />
                <span>{SUPPORT_EMAIL}</span>
                <ArrowUpRight size={15} />
              </a>
            )}
          </section>
        ))}
      </article>

      <footer className="legal-footer">
        <Link to="/" className="legal-footer-brand">
          <BookOpen size={18} />
          <span>Knowledgebase</span>
        </Link>

        <nav aria-label="Legal pages">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/cookies">Cookie Policy</Link>
        </nav>

        <span className="legal-copyright">
          © {new Date().getFullYear()} Knowledgebase
        </span>
      </footer>
    </main>
  );
}

export default LegalPage;