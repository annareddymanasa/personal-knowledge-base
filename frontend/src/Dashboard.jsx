import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Camera,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Heart,
  Home,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Mail,
  Pencil,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import "./noteInsights.css";
import RichTextEditor from "./components/RichTextEditor";
import RichTextContent from "./components/RichTextContent";
import NoteAttachments from "./components/NoteAttachments";

const API_URL = "http://localhost:5000/api";

const bookmarkColors = ["blue", "orange", "purple", "green"];

const noteCategories = [
  "Personal",
  "Ideas",
  "Development",
  "Learning",
  "Resources",
  "Work",
];

function getWebsiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getWebsiteInitial(url) {
  return getWebsiteName(url).charAt(0).toUpperCase() || "W";
}

function formatDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function isFavorite(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

function formatActivityTimestamp(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivityLabel(activity) {
  const entityLabels = {
    note: "note",
    folder: "folder",
    tag: "tag",
    bookmark: "bookmark",
    document: "attachment",
    activity: "item",
  };

  const entity = entityLabels[String(activity.entityType || "activity").toLowerCase()] || "item";
  const actionLabels = {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    favorited: "Favorited",
    restored: "Restored",
    uploaded: "Uploaded",
    downloaded: "Downloaded",
  };

  const action = String(activity.action || "updated").toLowerCase();
  const verb = actionLabels[action] || `${action.charAt(0).toUpperCase()}${action.slice(1)}`;

  return `${verb} ${entity}`;
}

function getActivitySubject(activity) {
  const details = activity.details && typeof activity.details === "object"
    ? activity.details
    : {};

  if (details.previousName && details.name) {
    return `${details.previousName} → ${details.name}`;
  }

  const subject = details.title || details.name || details.url || details.message;

  if (subject) return String(subject);
  if (activity.entityId) return `Record #${activity.entityId}`;

  return "Workspace activity";
}

function getActivityMetadata(activity) {
  const details = activity.details && typeof activity.details === "object"
    ? activity.details
    : {};

  const metadata = [];

  if (details.category) metadata.push(`Category: ${details.category}`);

  if (typeof details.favorite === "boolean") {
    metadata.push(details.favorite ? "Marked as favorite" : "Removed from favorites");
  }

  if (Array.isArray(details.tagIds) && details.tagIds.length > 0) {
    metadata.push(`${details.tagIds.length} ${details.tagIds.length === 1 ? "tag" : "tags"} assigned`);
  }

  if (details.folderId !== undefined) {
    metadata.push(details.folderId ? "Folder assignment updated" : "No folder assigned");
  }

  return metadata.join(" · ");
}

function getActivityIcon(entityType) {
  switch (String(entityType || "").toLowerCase()) {
    case "note":
      return <FileText size={18} />;
    case "folder":
      return <Folder size={18} />;
    case "bookmark":
      return <Bookmark size={18} />;
    case "tag":
      return <Tag size={18} />;
    case "document":
      return <Paperclip size={18} />;
    default:
      return <Activity size={18} />;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(getUser);
  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem("pkb-default-page");
    return ["Overview", "Notes", "Favorites", "Bookmarks", "Activity"].includes(savedPage)
      ? savedPage
      : "Overview";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileFormError, setProfileFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [defaultLandingPage, setDefaultLandingPage] = useState(() => {
    const savedPage = localStorage.getItem("pkb-default-page");
    return ["Overview", "Notes", "Favorites", "Bookmarks", "Activity"].includes(savedPage)
      ? savedPage
      : "Overview";
  });
  const [compactMode, setCompactMode] = useState(() =>
    localStorage.getItem("pkb-compact-mode") === "true"
  );
const [theme, setTheme] = useState(() => {
  const savedTheme = localStorage.getItem("pkb-theme");

  return ["paper", "midnight", "forest"].includes(savedTheme)
    ? savedTheme
    : "paper";
});

  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [activities, setActivities] = useState([]);

  const [notesLoading, setNotesLoading] = useState(true);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);

  const [notesError, setNotesError] = useState("");
  const [bookmarksError, setBookmarksError] = useState("");
  const [foldersError, setFoldersError] = useState("");
  const [tagsError, setTagsError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [operationError, setOperationError] = useState("");

  const [toast, setToast] = useState("");

  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showBookmarkEditor, setShowBookmarkEditor] = useState(false);
  const [showFolderEditor, setShowFolderEditor] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [noteVersions, setNoteVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [restoringVersionId, setRestoringVersionId] = useState(null);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);

  const [noteSaving, setNoteSaving] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [folderSaving, setFolderSaving] = useState(false);
  const [tagSaving, setTagSaving] = useState(false);

  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [deletingBookmarkId, setDeletingBookmarkId] = useState(null);
  const [deletingFolderId, setDeletingFolderId] = useState(null);
  const [deletingTagId, setDeletingTagId] = useState(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteInsights, setNoteInsights] = useState(null);
  const [noteInsightsLoading, setNoteInsightsLoading] = useState(false);
  const [noteInsightsError, setNoteInsightsError] = useState("");
  const [noteCategory, setNoteCategory] = useState("Personal");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const [bookmarkDescription, setBookmarkDescription] = useState("");

  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");

  const [tagName, setTagName] = useState("");

  const request = useCallback(
    async (method, endpoint, data) => {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("user");
        navigate("/login");
        throw new Error("Please sign in to continue.");
      }

      try {
        const response = await axios({
          method,
          url: `${API_URL}${endpoint}`,
          data,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        return response.data;
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
        }

        throw new Error(
          error.response?.data?.message ||
            "Unable to complete your request. Please try again."
        );
      }
    },
    [navigate]
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");

    try {
      const data = await request("get", "/profile");
      const profile = data.profile || {};
      const fullName = profile.fullName || profile.full_name || "";
      const email = profile.email || "";

      setProfileName(fullName);
      setProfileEmail(email);
      setUser((current) => {
        const updatedUser = { ...current, fullName, email };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });

      if (profile.hasProfilePicture) {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/profile/avatar`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });
        const nextUrl = URL.createObjectURL(response.data);
        setProfileAvatarUrl((currentUrl) => {
          if (currentUrl && currentUrl.startsWith("blob:")) {
            URL.revokeObjectURL(currentUrl);
          }
          return nextUrl;
        });
      } else {
        setProfileAvatarUrl((currentUrl) => {
          if (currentUrl && currentUrl.startsWith("blob:")) {
            URL.revokeObjectURL(currentUrl);
          }
          return null;
        });
      }
    } catch (error) {
      setProfileError(error.message || "Unable to load your profile.");
    } finally {
      setProfileLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileFormError("");

    if (!profileName.trim() || profileName.trim().length < 2) {
      setProfileFormError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail.trim())) {
      setProfileFormError("Please enter a valid email address.");
      return;
    }

    setProfileSaving(true);

    try {
      const data = await request("put", "/profile", {
        fullName: profileName.trim(),
        email: profileEmail.trim(),
      });
      const profile = data.profile || {
        fullName: profileName.trim(),
        email: profileEmail.trim(),
      };
      const updatedUser = {
        ...user,
        fullName: profile.fullName || profile.full_name || profileName.trim(),
        email: profile.email || profileEmail.trim(),
      };

      setUser(updatedUser);
      setProfileName(updatedUser.fullName);
      setProfileEmail(updatedUser.email);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      notify(data.message || "Profile updated successfully.");
    } catch (error) {
      setProfileFormError(error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const data = await request("patch", "/profile/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify(data.message || "Password changed successfully.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordSaving(false);
    }
  };
  const uploadProfilePicture = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProfileError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProfileError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Your profile picture must be 2 MB or smaller.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("profilePicture", file);
    setAvatarSaving(true);

    try {
      const response = await axios.post(`${API_URL}/profile/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadProfile();
      notify(response.data.message || "Profile picture updated.");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
      setProfileError(
        error.response?.data?.message || "Unable to upload your profile picture."
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeProfilePicture = async () => {
    setProfileError("");

    try {
      const data = await request("delete", "/profile/avatar");
      await loadProfile();
      notify(data.message || "Profile picture removed.");
    } catch (error) {
      setProfileError(error.message);
    }
  };

  const updateDefaultLandingPage = (value) => {
    setDefaultLandingPage(value);
    localStorage.setItem("pkb-default-page", value);
    notify("Default landing page preference saved on this device.");
  };

  const updateCompactMode = (value) => {
    setCompactMode(value);
    localStorage.setItem("pkb-compact-mode", String(value));
    notify("Display preference saved on this device.");
  };

  const notify = useCallback((message) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    setNotesError("");

    try {
      const data = await request("get", "/notes");
      const records = Array.isArray(data.notes) ? data.notes : [];

      const normalizedNotes = await Promise.all(
        records.map(async (note) => {
          let noteTags = [];

          try {
            const tagData = await request(
              "get",
              `/tags/notes/${note.id}`
            );

            noteTags = Array.isArray(tagData.tags)
              ? tagData.tags.map((tag) => ({
                  ...tag,
                  id: String(tag.id),
                }))
              : [];
          } catch {
            noteTags = [];
          }

          return {
            ...note,
            id: String(note.id),
            folderId:
              note.folderId === null || note.folderId === undefined
                ? null
                : String(note.folderId),
            title: note.title || "",
            content: note.content || "",
            category: note.category || "Personal",
            is_favorite: isFavorite(
              note.is_favorite ?? note.favorite
            ),
            updated_at:
              note.updated_at ||
              note.updatedAt ||
              note.created_at ||
              note.createdAt,
            tags: noteTags,
          };
        })
      );

      setNotes(normalizedNotes);
    } catch (error) {
      setNotesError(error.message);
    } finally {
      setNotesLoading(false);
    }
  }, [request]);

  const loadBookmarks = useCallback(async () => {
    setBookmarksLoading(true);
    setBookmarksError("");

    try {
      const data = await request("get", "/bookmarks");
      const records = Array.isArray(data.bookmarks)
        ? data.bookmarks
        : [];

      setBookmarks(
        records.map((bookmark, index) => ({
          ...bookmark,
          id: String(bookmark.id),
          title: bookmark.title || "",
          url: bookmark.url || "",
          description: bookmark.description || "",
          is_favorite: isFavorite(
            bookmark.is_favorite ?? bookmark.favorite
          ),
          color: bookmarkColors[index % bookmarkColors.length],
        }))
      );
    } catch (error) {
      setBookmarksError(error.message);
    } finally {
      setBookmarksLoading(false);
    }
  }, [request]);

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    setFoldersError("");

    try {
      const data = await request("get", "/folders");
      const records = Array.isArray(data.folders)
        ? data.folders
        : [];

      setFolders(
        records.map((folder) => ({
          ...folder,
          id: String(folder.id),
          name: folder.name || "",
          description: folder.description || "",
          noteCount: Number(folder.noteCount || 0),
        }))
      );
    } catch (error) {
      setFoldersError(error.message);
    } finally {
      setFoldersLoading(false);
    }
  }, [request]);

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError("");

    try {
      const data = await request("get", "/tags");
      const records = Array.isArray(data.tags) ? data.tags : [];

      setTags(
        records.map((tag) => ({
          ...tag,
          id: String(tag.id),
          name: tag.name || "",
          noteCount: Number(tag.noteCount || 0),
        }))
      );
    } catch (error) {
      setTagsError(error.message);
    } finally {
      setTagsLoading(false);
    }
  }, [request]);

  const loadActivities = useCallback(async (page = 1, append = false) => {
    if (append) {
      setActivityLoadingMore(true);
    } else {
      setActivityLoading(true);
    }

    setActivityError("");

    try {
      const data = await request("get", `/activity?page=${page}&limit=20`);
      const records = Array.isArray(data.activities) ? data.activities : [];
      const normalizedActivities = records.map((activity) => {
        let details = activity.details;

        if (typeof details === "string") {
          try {
            details = JSON.parse(details);
          } catch {
            details = { message: details };
          }
        }

        return {
          ...activity,
          id: String(activity.id),
          entityType: activity.entityType || activity.entity_type || "activity",
          entityId:
            activity.entityId === null || activity.entityId === undefined
              ? null
              : String(activity.entityId),
          action: activity.action || "updated",
          details: details && typeof details === "object" ? details : {},
          createdAt: activity.createdAt || activity.created_at || null,
        };
      });

      setActivities((current) =>
        append ? [...current, ...normalizedActivities] : normalizedActivities
      );

      setActivityPagination(
        data.pagination || {
          page,
          limit: 20,
          total: normalizedActivities.length,
          totalPages: normalizedActivities.length ? 1 : 0,
        }
      );
    } catch (error) {
      setActivityError(error.message);
    } finally {
      setActivityLoading(false);
      setActivityLoadingMore(false);
    }
  }, [request]);

  useEffect(() => {
    loadNotes();
    loadBookmarks();
    loadFolders();
    loadTags();
    loadActivities();
  }, [loadNotes, loadBookmarks, loadFolders, loadTags, loadActivities]);

  const favoriteNotesCount = notes.filter(
    (note) => note.is_favorite
  ).length;

  const favoriteBookmarksCount = bookmarks.filter(
    (bookmark) => bookmark.is_favorite
  ).length;

  const totalFavorites =
    favoriteNotesCount + favoriteBookmarksCount;

  const firstName =
    user.fullName?.trim().split(/\s+/)[0] ||
    user.full_name?.trim().split(/\s+/)[0] ||
    user.name?.trim().split(/\s+/)[0] ||
    "there";

  const currentFolderId = activePage.startsWith("Folder:")
    ? activePage.slice("Folder:".length)
    : null;

  const currentTagId = activePage.startsWith("Tag:")
    ? activePage.slice("Tag:".length)
    : null;

  const currentFolder = currentFolderId
    ? folders.find((folder) => folder.id === currentFolderId)
    : null;

  const currentTag = currentTagId
    ? tags.find((tag) => tag.id === currentTagId)
    : null;

  const filteredNotes = useMemo(() => {
    let records = [...notes];

    if (activePage === "Favorites") {
      records = records.filter((note) => note.is_favorite);
    }

    if (currentFolderId !== null) {
      records = records.filter(
        (note) => note.folderId === currentFolderId
      );
    }

    if (currentTagId !== null) {
      records = records.filter((note) =>
        note.tags.some((tag) => tag.id === currentTagId)
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      records = records.filter((note) =>
        `${note.title} ${note.content} ${note.category} ${note.tags
          .map((tag) => tag.name)
          .join(" ")}`
          .toLowerCase()
          .includes(query)
      );
    }

    return records;
  }, [
    notes,
    activePage,
    currentFolderId,
    currentTagId,
    searchQuery,
  ]);

  const filteredBookmarks = useMemo(() => {
    let records = [...bookmarks];

    if (activePage === "Favorites") {
      records = records.filter(
        (bookmark) => bookmark.is_favorite
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      records = records.filter((bookmark) =>
        `${bookmark.title} ${bookmark.url} ${bookmark.description}`
          .toLowerCase()
          .includes(query)
      );
    }

    return records;
  }, [bookmarks, activePage, searchQuery]);

  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort(
          (a, b) =>
            new Date(b.updated_at || 0) -
            new Date(a.updated_at || 0)
        )
        .slice(0, 4),
    [notes]
  );

  const navigateTo = (page) => {
    setActivePage(page);
    setSearchQuery("");
    setSidebarOpen(false);
  };

  const generateNoteInsights = async () => {
    const plainContent = String(noteContent || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (plainContent.length < 20) {
      setNoteInsights(null);
      setNoteInsightsError("Please write at least 20 characters before generating insights.");
      return;
    }

    setNoteInsightsLoading(true);
    setNoteInsightsError("");

    try {
      const result = await request("post", "/note-insights", {
        title: noteTitle.trim(),
        content: plainContent
      });

      setNoteInsights({
        summary: result.summary,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        suggestedTags: Array.isArray(result.suggestedTags) ? result.suggestedTags : []
      });
    } catch (error) {
      setNoteInsightsError(error.message || "Unable to generate AI insights. Please try again.");
    } finally {
      setNoteInsightsLoading(false);
    }
  };

  const openNoteEditor = (note = null, folderId = "") => {
    setNoteInsights(null);
    setNoteInsightsError("");
    setNoteInsightsLoading(false);
    setOperationError("");
    setEditingNoteId(note?.id ?? null);
    setNoteTitle(note?.title || "");
    setNoteContent(note?.content || "");
    setNoteCategory(note?.category || "Personal");
    setSelectedFolderId(
      note?.folderId ?? (folderId !== "" ? folderId : "")
    );
    setSelectedTagIds(
      note?.tags?.map((tag) => String(tag.id)) || []
    );
    setShowNoteEditor(true);
  };

  const closeNoteEditor = () => {
    if (noteSaving) return;

    setShowNoteEditor(false);
    setNoteInsights(null);
    setNoteInsightsError("");
    setNoteInsightsLoading(false);
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteCategory("Personal");
    setSelectedFolderId("");
    setSelectedTagIds([]);
    setOperationError("");
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setOperationError("");

    if (!noteTitle.trim()) {
      setOperationError("Please enter a title for your note.");
      return;
    }

    setNoteSaving(true);

    try {
      const payload = {
        title: noteTitle.trim(),
        content: noteContent,
        category: noteCategory,
        folderId: selectedFolderId || null,
      };

      let savedNoteId = editingNoteId;

      if (editingNoteId !== null) {
        await request("put", `/notes/${editingNoteId}`, payload);
        notify("Note updated successfully!");
      } else {
        const result = await request("post", "/notes", payload);
        savedNoteId = String(result.note.id);
        notify("Note saved successfully!");
      }

      await request("put", `/tags/notes/${savedNoteId}`, {
        tagIds: selectedTagIds,
      });

      setShowNoteEditor(false);
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteCategory("Personal");
      setSelectedFolderId("");
      setSelectedTagIds([]);

      await Promise.all([
        loadNotes(),
        loadFolders(),
        loadTags(),
      ]);

      if (currentFolderId) {
        setActivePage(`Folder:${currentFolderId}`);
      } else if (currentTagId) {
        setActivePage(`Tag:${currentTagId}`);
      } else {
        setActivePage("Notes");
      }
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setNoteSaving(false);
    }
  };

  const loadNoteVersions = useCallback(async (noteId) => {
    if (!noteId) return;

    setVersionsLoading(true);
    setVersionsError("");

    try {
      const data = await request("get", `/versions/notes/${noteId}`);
      const records = Array.isArray(data.versions) ? data.versions : [];

      setNoteVersions(
        records.map((version) => ({
          ...version,
          id: String(version.id),
          noteId: String(version.noteId ?? noteId),
          title: version.title || "Untitled note",
          content: version.content || "",
          createdAt: version.createdAt || version.created_at || null,
        }))
      );
    } catch (error) {
      setVersionsError(error.message);
    } finally {
      setVersionsLoading(false);
    }
  }, [request]);

  const openVersionHistory = async () => {
    if (editingNoteId === null) return;

    setShowVersionHistory(true);
    await loadNoteVersions(editingNoteId);
  };

  const closeVersionHistory = () => {
    if (restoringVersionId !== null) return;

    setShowVersionHistory(false);
    setVersionsError("");
  };

  const restoreNoteVersion = async (version) => {
    if (editingNoteId === null) return;

    const confirmed = window.confirm(
      `Restore the version saved on ${formatActivityTimestamp(version.createdAt)}? Your current note content will be saved in history first.`
    );

    if (!confirmed) return;

    setRestoringVersionId(version.id);
    setVersionsError("");

    try {
      const result = await request(
        "post",
        `/versions/notes/${editingNoteId}/${version.id}/restore`
      );

      const restoredNote = result.note;

      if (restoredNote) {
        setNoteTitle(restoredNote.title || "");
        setNoteContent(restoredNote.content || "");
        setNoteCategory(restoredNote.category || "Personal");
        setSelectedFolderId(
          restoredNote.folderId === null || restoredNote.folderId === undefined
            ? ""
            : String(restoredNote.folderId)
        );
      }

      await Promise.all([
        loadNoteVersions(editingNoteId),
        loadNotes(),
        loadFolders(),
        loadTags(),
        loadActivities(),
      ]);

      notify("Previous version restored successfully.");
    } catch (error) {
      setVersionsError(error.message);
    } finally {
      setRestoringVersionId(null);
    }
  };

  const deleteNote = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this note?"
    );

    if (!confirmed) return;

    setDeletingNoteId(id);

    try {
      await request("delete", `/notes/${id}`);

      await Promise.all([
        loadNotes(),
        loadFolders(),
        loadTags(),
      ]);

      notify("Note deleted successfully.");
    } catch (error) {
      notify(error.message);
    } finally {
      setDeletingNoteId(null);
    }
  };

  const toggleNoteFavorite = async (note) => {
    try {
      await request("put", `/notes/${note.id}`, {
        title: note.title,
        content: note.content,
        category: note.category || "Personal",
        folderId: note.folderId,
        is_favorite: !note.is_favorite,
      });

      await loadNotes();

      notify(
        note.is_favorite
          ? "Removed from favorites."
          : "Added to favorites."
      );
    } catch (error) {
      notify(error.message);
    }
  };

  const openFolderEditor = (folder = null) => {
    setOperationError("");
    setEditingFolderId(folder?.id ?? null);
    setFolderName(folder?.name || "");
    setFolderDescription(folder?.description || "");
    setShowFolderEditor(true);
    setSidebarOpen(false);
  };

  const closeFolderEditor = () => {
    if (folderSaving) return;

    setShowFolderEditor(false);
    setEditingFolderId(null);
    setFolderName("");
    setFolderDescription("");
    setOperationError("");
  };

  const saveFolder = async (event) => {
    event.preventDefault();
    setOperationError("");

    if (!folderName.trim()) {
      setOperationError("Please enter a folder name.");
      return;
    }

    setFolderSaving(true);

    try {
      const payload = {
        name: folderName.trim(),
        description: folderDescription.trim(),
      };

      if (editingFolderId !== null) {
        await request(
          "put",
          `/folders/${editingFolderId}`,
          payload
        );

        notify("Folder renamed successfully!");
      } else {
        await request("post", "/folders", payload);
        notify("Folder created successfully!");
      }

      setShowFolderEditor(false);
      setEditingFolderId(null);
      setFolderName("");
      setFolderDescription("");

      await loadFolders();
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setFolderSaving(false);
    }
  };

  const deleteFolder = async (folder) => {
    const confirmed = window.confirm(
      `Delete the folder "${folder.name}"? Its notes will be kept outside the folder.`
    );

    if (!confirmed) return;

    setDeletingFolderId(folder.id);

    try {
      await request("delete", `/folders/${folder.id}`);

      await Promise.all([loadFolders(), loadNotes()]);

      if (currentFolderId === folder.id) {
        setActivePage("Notes");
      }

      notify("Folder deleted. Its notes have been kept.");
    } catch (error) {
      notify(error.message);
    } finally {
      setDeletingFolderId(null);
    }
  };

  const openTagEditor = (tag = null) => {
    setOperationError("");
    setEditingTagId(tag?.id ?? null);
    setTagName(tag?.name || "");
    setShowTagEditor(true);
    setSidebarOpen(false);
  };

  const closeTagEditor = () => {
    if (tagSaving) return;

    setShowTagEditor(false);
    setEditingTagId(null);
    setTagName("");
    setOperationError("");
  };

  const saveTag = async (event) => {
    event.preventDefault();
    setOperationError("");

    if (!tagName.trim()) {
      setOperationError("Please enter a tag name.");
      return;
    }

    setTagSaving(true);

    try {
      if (editingTagId !== null) {
        await request("put", `/tags/${editingTagId}`, {
          name: tagName.trim(),
        });

        notify("Tag renamed successfully!");
      } else {
        await request("post", "/tags", {
          name: tagName.trim(),
        });

        notify("Tag created successfully!");
      }

      setShowTagEditor(false);
      setEditingTagId(null);
      setTagName("");

      await Promise.all([loadTags(), loadNotes()]);
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setTagSaving(false);
    }
  };

  const deleteTag = async (tag) => {
    const confirmed = window.confirm(
      `Delete the tag "${tag.name}"? The notes themselves will not be deleted.`
    );

    if (!confirmed) return;

    setDeletingTagId(tag.id);

    try {
      await request("delete", `/tags/${tag.id}`);

      await Promise.all([loadTags(), loadNotes()]);

      if (currentTagId === tag.id) {
        setActivePage("Notes");
      }

      notify("Tag deleted successfully.");
    } catch (error) {
      notify(error.message);
    } finally {
      setDeletingTagId(null);
    }
  };

  const toggleSelectedTag = (tagId) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  };

  const addBookmark = async (event) => {
    event.preventDefault();
    setOperationError("");

    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) {
      setOperationError("Please enter a title and website URL.");
      return;
    }

    let normalizedUrl = bookmarkUrl.trim();

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".")
      ) {
        throw new Error("Invalid website URL.");
      }
    } catch {
      setOperationError("Please enter a valid website URL.");
      return;
    }

    setBookmarkSaving(true);

    try {
      await request("post", "/bookmarks", {
        title: bookmarkTitle.trim(),
        url: normalizedUrl,
        description: bookmarkDescription.trim(),
      });

      setBookmarkTitle("");
      setBookmarkUrl("");
      setBookmarkDescription("");
      setShowBookmarkEditor(false);

      await loadBookmarks();

      setActivePage("Bookmarks");
      notify("Bookmark saved successfully!");
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setBookmarkSaving(false);
    }
  };

  const deleteBookmark = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this bookmark?"
    );

    if (!confirmed) return;

    setDeletingBookmarkId(id);

    try {
      await request("delete", `/bookmarks/${id}`);

      setBookmarks((current) =>
        current.filter((bookmark) => bookmark.id !== id)
      );

      notify("Bookmark deleted successfully.");
    } catch (error) {
      notify(error.message);
    } finally {
      setDeletingBookmarkId(null);
    }
  };

  const toggleBookmarkFavorite = async (bookmark) => {
    const nextFavorite = !bookmark.is_favorite;

    try {
      await request("put", `/bookmarks/${bookmark.id}`, {
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        favorite: nextFavorite,
        is_favorite: nextFavorite,
      });

      await loadBookmarks();

      notify(
        nextFavorite
          ? "Added to favorites!"
          : "Removed from favorites."
      );
    } catch (error) {
      notify(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const renderError = (message, retry) => (
    <div className="pkb-error">
      <ShieldAlert size={20} />
      <span>{message}</span>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );

  const renderActivityPage = () => {
    const canLoadMore = activityPagination.page < activityPagination.totalPages;

    return (
      <>
        <section className="pkb-page-heading">
          <div>
            <div className="pkb-eyebrow">
              <Activity size={15} />
              YOUR WORKSPACE HISTORY
            </div>
            <h1>Activity</h1>
            <p>See what has changed across your notes, folders, tags, and bookmarks.</p>
          </div>

          <button
            type="button"
            className="pkb-secondary-button"
            onClick={() => loadActivities(1, false)}
            disabled={activityLoading}
          >
            <RefreshCw size={16} className={activityLoading ? "pkb-spinner" : ""} />
            Refresh activity
          </button>
        </section>
        {activityError ? (
          renderError(activityError, () => loadActivities(1, false))
        ) : activityLoading && activities.length === 0 ? (
          <div className="pkb-loading">
            <LoaderCircle className="pkb-spinner" size={25} />
            <span>Loading your activity...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="pkb-empty">
            <div className="pkb-empty-icon">
              <Activity size={27} />
            </div>
            <h3>No activity yet</h3>
            <p>Your recent actions will appear here as you work with notes, folders, tags, and bookmarks.</p>
            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => navigateTo("Overview")}
            >
              Return to overview
            </button>
          </div>
        ) : (
          <>
            <div className="pkb-activity-summary">
              <span>
                Showing {activities.length} of {activityPagination.total} activities
              </span>
              <span>Newest first</span>
            </div>

            <div className="pkb-activity-list">
              {activities.map((activity) => {
                const entityType = String(activity.entityType || "activity").toLowerCase();
                const activityClass = entityType.replace(/[^a-z0-9-]/g, "");
                const metadata = getActivityMetadata(activity);

                return (
                  <article className="pkb-activity-item" key={activity.id}>
                    <div className={`pkb-activity-icon pkb-activity-${activityClass}`}>
                      {getActivityIcon(entityType)}
                    </div>

                    <div className="pkb-activity-body">
                      <div className="pkb-activity-title-row">
                        <h3>{getActivityLabel(activity)}</h3>
                        <time dateTime={activity.createdAt || undefined}>
                          {formatActivityTimestamp(activity.createdAt)}
                        </time>
                      </div>

                      <p className="pkb-activity-subject">
                        {getActivitySubject(activity)}
                      </p>

                      {metadata && (
                        <p className="pkb-activity-metadata">{metadata}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {canLoadMore && (
              <div className="pkb-activity-load-more">
                <button
                  type="button"
                  className="pkb-secondary-button"
                  disabled={activityLoadingMore}
                  onClick={() => loadActivities(activityPagination.page + 1, true)}
                >
                  {activityLoadingMore ? (
                    <>
                      <LoaderCircle className="pkb-spinner" size={16} />
                      Loading more...
                    </>
                  ) : (
                    "Load more activity"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  const renderNoteCards = (records) => {
    if (notesLoading) {
      return (
        <div className="pkb-loading">
          <LoaderCircle className="pkb-spinner" size={25} />
          <span>Loading your notes...</span>
        </div>
      );
    }

    if (notesError) {
      return renderError(notesError, loadNotes);
    }

    if (records.length === 0) {
      return (
        <div className="pkb-empty">
          <div className="pkb-empty-icon">
            <FileText size={27} />
          </div>
          <h3>
            {searchQuery ? "No matching notes" : "No notes yet"}
          </h3>
          <p>
            {searchQuery
              ? "Try another search term."
              : "Create a note to start building your knowledge base."}
          </p>
          {!searchQuery && (
            <button
              className="pkb-primary-button"
              type="button"
              onClick={() =>
                openNoteEditor(
                  null,
                  currentFolderId || ""
                )
              }
            >
              <Plus size={17} />
              Create a note
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="pkb-note-grid">
        {records.map((note) => {
          const folder = folders.find(
            (item) => item.id === note.folderId
          );

          return (
            <article className="pkb-note-card" key={note.id}>
              <div className="pkb-note-card-top">
                <span className="pkb-category">
                  {note.category || "Personal"}
                </span>

                <div className="pkb-card-actions">
                  <button
                    type="button"
                    className={`pkb-icon-button ${
                      note.is_favorite ? "is-favorite" : ""
                    }`}
                    title={
                      note.is_favorite
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    aria-label="Toggle note favorite"
                    onClick={() => toggleNoteFavorite(note)}
                  >
                    <Star
                      size={17}
                      fill={
                        note.is_favorite ? "currentColor" : "none"
                      }
                    />
                  </button>

                  <button
                    type="button"
                    className="pkb-icon-button"
                    title="Edit note"
                    aria-label="Edit note"
                    onClick={() => openNoteEditor(note)}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    className="pkb-icon-button pkb-delete-button"
                    title="Delete note"
                    aria-label="Delete note"
                    disabled={deletingNoteId === note.id}
                    onClick={() => deleteNote(note.id)}
                  >
                    {deletingNoteId === note.id ? (
                      <LoaderCircle
                        className="pkb-spinner"
                        size={16}
                      />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="pkb-note-content-button"
                onClick={() => openNoteEditor(note)}
              >
               <h3>{note.title}</h3>

<div className="pkb-note-preview">
  <RichTextContent
    content={note.content || "No additional content."}
  />
</div>
              </button>

              {note.tags.length > 0 && (
                <div className="pkb-note-tags">
                  {note.tags.map((tag) => (
                    <button
                      type="button"
                      className="pkb-note-tag"
                      key={tag.id}
                      onClick={() => navigateTo(`Tag:${tag.id}`)}
                    >
                      <Tag size={12} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}

              {folder && (
                <button
                  type="button"
                  className="pkb-note-folder-link"
                  onClick={() => navigateTo(`Folder:${folder.id}`)}
                >
                  <Folder size={13} />
                  {folder.name}
                </button>
              )}

              <div className="pkb-note-card-footer">
                <span>
                  <Clock3 size={14} />
                  {formatDate(note.updated_at)}
                </span>

                <button
                  type="button"
                  onClick={() => openNoteEditor(note)}
                >
                  Open note <ArrowUpRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderBookmarkCards = (records) => {
    if (bookmarksLoading) {
      return (
        <div className="pkb-loading">
          <LoaderCircle className="pkb-spinner" size={25} />
          <span>Loading your bookmarks...</span>
        </div>
      );
    }

    if (bookmarksError) {
      return renderError(bookmarksError, loadBookmarks);
    }

    if (records.length === 0) {
      return (
        <div className="pkb-empty">
          <div className="pkb-empty-icon">
            <Bookmark size={27} />
          </div>
          <h3>
            {searchQuery
              ? "No matching bookmarks"
              : "No bookmarks yet"}
          </h3>
          <p>
            {searchQuery
              ? "Try searching for another website."
              : "Save useful websites here to find them later."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => {
                setOperationError("");
                setShowBookmarkEditor(true);
              }}
            >
              <Plus size={17} />
              Add a bookmark
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="pkb-bookmark-grid">
        {records.map((bookmark, index) => (
          <article
            className="pkb-bookmark-card"
            key={bookmark.id}
          >
            <div className="pkb-bookmark-card-top">
              <div
                className={`pkb-site-icon ${
                  bookmarkColors[index % bookmarkColors.length]
                }`}
              >
                {getWebsiteInitial(bookmark.url)}
              </div>

              <div className="pkb-card-actions">
                <button
                  type="button"
                  className={`pkb-icon-button ${
                    bookmark.is_favorite ? "is-favorite" : ""
                  }`}
                  title={
                    bookmark.is_favorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  aria-label="Toggle bookmark favorite"
                  onClick={() => toggleBookmarkFavorite(bookmark)}
                >
                  <Star
                    size={17}
                    fill={
                      bookmark.is_favorite
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>

                <button
                  type="button"
                  className="pkb-icon-button pkb-delete-button"
                  title="Delete bookmark"
                  aria-label="Delete bookmark"
                  disabled={deletingBookmarkId === bookmark.id}
                  onClick={() => deleteBookmark(bookmark.id)}
                >
                  {deletingBookmarkId === bookmark.id ? (
                    <LoaderCircle
                      className="pkb-spinner"
                      size={16}
                    />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>

            <h3>{bookmark.title}</h3>

            <p className="pkb-bookmark-description">
              {bookmark.description || "Saved website"}
            </p>

            <div className="pkb-bookmark-footer">
              <span title={bookmark.url}>
                <Globe size={14} />
                {getWebsiteName(bookmark.url)}
              </span>

              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${bookmark.title}`}
              >
                Visit <ArrowUpRight size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <section className="pkb-welcome">
        <div>
          <div className="pkb-eyebrow">
            <Sparkles size={15} />
            YOUR PERSONAL SPACE
          </div>

          <h1>Welcome back, {firstName}!</h1>

          <p>
            Your ideas, notes, and favorite resources, all in one place.
          </p>
        </div>

        <button
          type="button"
          className="pkb-primary-button"
          onClick={() => openNoteEditor()}
        >
          <Plus size={18} />
          Create a note
        </button>
      </section>

      <section className="pkb-stat-grid">
        <button
          type="button"
          className="pkb-stat-card"
          onClick={() => navigateTo("Notes")}
        >
          <div className="pkb-stat-icon pkb-stat-purple">
            <FileText size={21} />
          </div>
          <span>Total notes</span>
          <strong>{notesLoading ? "—" : notes.length}</strong>
          <small>Saved in your knowledge base</small>
        </button>

        <button
          type="button"
          className="pkb-stat-card"
          onClick={() => navigateTo("Bookmarks")}
        >
          <div className="pkb-stat-icon pkb-stat-blue">
            <Bookmark size={21} />
          </div>
          <span>Bookmarks</span>
          <strong>
            {bookmarksLoading ? "—" : bookmarks.length}
          </strong>
          <small>Websites saved for later</small>
        </button>

        <button
          type="button"
          className="pkb-stat-card"
          onClick={() => navigateTo("Favorites")}
        >
          <div className="pkb-stat-icon pkb-stat-orange">
            <Heart size={21} />
          </div>
          <span>Favorite notes</span>
          <strong>
            {notesLoading ? "—" : favoriteNotesCount}
          </strong>
          <small>Notes marked as favorites</small>
        </button>

        <button
          type="button"
          className="pkb-stat-card"
          onClick={() => navigateTo("Favorites")}
        >
          <div className="pkb-stat-icon pkb-stat-green">
            <Star size={21} />
          </div>
          <span>Favorite bookmarks</span>
          <strong>
            {bookmarksLoading ? "—" : favoriteBookmarksCount}
          </strong>
          <small>Important saved websites</small>
        </button>
      </section>

      <section className="pkb-section">
        <div className="pkb-section-heading">
          <div>
            <h2>Recently updated notes</h2>
            <p>Pick up where you left off.</p>
          </div>

          <button
            type="button"
            className="pkb-text-button"
            onClick={() => navigateTo("Notes")}
          >
            View all <ArrowUpRight size={16} />
          </button>
        </div>

        {renderNoteCards(recentNotes)}
      </section>

      <section className="pkb-section">
        <div className="pkb-section-heading">
          <div>
            <h2>Saved websites</h2>
            <p>Your bookmarked resources.</p>
          </div>

          <button
            type="button"
            className="pkb-text-button"
            onClick={() => navigateTo("Bookmarks")}
          >
            View all <ArrowUpRight size={16} />
          </button>
        </div>

        {renderBookmarkCards(bookmarks.slice(0, 3))}
      </section>
    </>
  );

  const renderCurrentPage = () => {
    if (activePage === "Overview") {
      return renderOverview();
    }

    if (activePage === "Notes") {
      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <BookOpen size={15} />
                YOUR KNOWLEDGE BASE
              </div>
              <h1>My Notes</h1>
              <p>
                Capture your thoughts and keep important information organized.
              </p>
            </div>

            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => openNoteEditor()}
            >
              <Plus size={18} />
              New note
            </button>
          </section>

          {renderNoteCards(filteredNotes)}
        </>
      );
    }

    if (activePage === "Bookmarks") {
      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Globe size={15} />
                YOUR SAVED RESOURCES
              </div>
              <h1>Bookmarks</h1>
              <p>Keep useful websites close at hand.</p>
            </div>

            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => {
                setOperationError("");
                setShowBookmarkEditor(true);
              }}
            >
              <Plus size={18} />
              Add bookmark
            </button>
          </section>

          {renderBookmarkCards(filteredBookmarks)}
        </>
      );
    }

    if (activePage === "Favorites") {
      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Heart size={15} />
                YOUR IMPORTANT ITEMS
              </div>
              <h1>Favorites</h1>
              <p>
                Quickly find the notes and websites you care about most.
              </p>
            </div>
          </section>

          <section className="pkb-section">
            <div className="pkb-section-heading">
              <div>
                <h2>Favorite notes</h2>
                <p>
                  {notesLoading
                    ? "Loading..."
                    : `${favoriteNotesCount} saved notes`}
                </p>
              </div>
            </div>

            {renderNoteCards(
              filteredNotes.filter((note) => note.is_favorite)
            )}
          </section>

          <section className="pkb-section">
            <div className="pkb-section-heading">
              <div>
                <h2>Favorite bookmarks</h2>
                <p>
                  {bookmarksLoading
                    ? "Loading..."
                    : `${favoriteBookmarksCount} saved websites`}
                </p>
              </div>
            </div>

            {renderBookmarkCards(
              filteredBookmarks.filter(
                (bookmark) => bookmark.is_favorite
              )
            )}
          </section>
        </>
      );
    }

    if (activePage === "Tags") {
      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Tag size={15} />
                NOTE ORGANIZATION
              </div>
              <h1>Tags</h1>
              <p>
                Create reusable labels to organize related notes.
              </p>
            </div>

            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => openTagEditor()}
            >
              <Plus size={18} />
              Create tag
            </button>
          </section>

          {tagsLoading ? (
            <div className="pkb-loading">
              <LoaderCircle className="pkb-spinner" size={25} />
              Loading your tags...
            </div>
          ) : tagsError ? (
            renderError(tagsError, loadTags)
          ) : tags.length === 0 ? (
            <div className="pkb-empty">
              <div className="pkb-empty-icon">
                <Tag size={27} />
              </div>
              <h3>No tags yet</h3>
              <p>
                Create tags such as Programming, Learning, and Projects.
              </p>
              <button
                type="button"
                className="pkb-primary-button"
                onClick={() => openTagEditor()}
              >
                <Plus size={17} />
                Create your first tag
              </button>
            </div>
          ) : (
            <div className="pkb-tag-grid">
              {tags.map((tag) => (
                <article className="pkb-tag-card" key={tag.id}>
                  <button
                    type="button"
                    className="pkb-tag-open"
                    onClick={() => navigateTo(`Tag:${tag.id}`)}
                  >
                    <span className="pkb-tag-icon">
                      <Tag size={20} />
                    </span>
                    <span className="pkb-tag-info">
                      <strong>{tag.name}</strong>
                      <small>
                        {tag.noteCount}{" "}
                        {tag.noteCount === 1 ? "note" : "notes"}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>

                  <div className="pkb-tag-actions">
                    <button
                      type="button"
                      onClick={() => openTagEditor(tag)}
                    >
                      <Pencil size={14} />
                      Rename
                    </button>

                    <button
                      type="button"
                      disabled={deletingTagId === tag.id}
                      onClick={() => deleteTag(tag)}
                    >
                      {deletingTagId === tag.id ? (
                        <LoaderCircle
                          className="pkb-spinner"
                          size={14}
                        />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      );
    }

    if (currentFolderId !== null) {
      if (!currentFolder) {
        return (
          <div className="pkb-empty">
            <Folder size={30} />
            <h3>Folder not found</h3>
            <p>This folder may have been deleted or is no longer available.</p>
            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => navigateTo("Notes")}
            >
              View all notes
            </button>
          </div>
        );
      }

      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Folder size={15} />
                YOUR FOLDER
              </div>
              <h1>{currentFolder.name}</h1>
              <p>
                {currentFolder.description ||
                  "Notes organized in this folder."}
              </p>
              <span className="pkb-folder-note-count">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"}
              </span>
            </div>

            <div className="pkb-heading-actions">
              <button
                type="button"
                className="pkb-secondary-button"
                onClick={() => openFolderEditor(currentFolder)}
              >
                <Pencil size={16} />
                Rename folder
              </button>

              <button
                type="button"
                className="pkb-primary-button"
                onClick={() =>
                  openNoteEditor(null, currentFolder.id)
                }
              >
                <Plus size={18} />
                New note
              </button>
            </div>
          </section>

          {renderNoteCards(filteredNotes)}
        </>
      );
    }

    if (currentTagId !== null) {
      if (!currentTag) {
        return (
          <div className="pkb-empty">
            <Tag size={30} />
            <h3>Tag not found</h3>
            <p>This tag may have been deleted or is no longer available.</p>
            <button
              type="button"
              className="pkb-primary-button"
              onClick={() => navigateTo("Tags")}
            >
              View all tags
            </button>
          </div>
        );
      }

      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Tag size={15} />
                FILTERED BY TAG
              </div>
              <h1>{currentTag.name}</h1>
              <p>
                Find all notes associated with this tag.
              </p>
              <span className="pkb-folder-note-count">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"}
              </span>
            </div>

            <button
              type="button"
              className="pkb-secondary-button"
              onClick={() => openTagEditor(currentTag)}
            >
              <Pencil size={16} />
              Rename tag
            </button>
          </section>

          {renderNoteCards(filteredNotes)}
        </>
      );
    }

    if (activePage === "Activity") {
      return renderActivityPage();
    }

    if (activePage === "Settings") {
      return (
        <>
          <section className="pkb-page-heading">
            <div>
              <div className="pkb-eyebrow">
                <Settings size={15} />
                YOUR ACCOUNT
              </div>
              <h1>Settings & profile</h1>
              <p>Manage your personal information, profile picture, password, and workspace preferences.</p>
            </div>
            <button type="button" className="pkb-secondary-button" onClick={handleLogout}>
              <LogOut size={16} />
              Sign out
            </button>
          </section>

          {profileLoading ? (
            <div className="pkb-loading">
              <LoaderCircle className="pkb-spinner" size={24} />
              Loading your profile...
            </div>
          ) : (
            <div className="pkb-settings-layout">
              <section className="pkb-settings-card pkb-settings-profile-card">
                <div className="pkb-settings-card-heading">
                  <div className="pkb-settings-heading-icon"><UserRound size={20} /></div>
                  <div>
                    <h2>Personal profile</h2>
                    <p>Update the name and email connected to your account.</p>
                  </div>
                </div>

                <div className="pkb-profile-picture-area">
                  <div className="pkb-profile-picture-large">
                    {profileAvatarUrl ? (
                      <img src={profileAvatarUrl} alt="Your profile" />
                    ) : (
                      <span>{(profileName || firstName || "U").charAt(0).toUpperCase()}</span>
                    )}
                    {avatarSaving && <span className="pkb-avatar-loading"><LoaderCircle className="pkb-spinner" size={18} /></span>}
                  </div>
                  <div className="pkb-profile-picture-actions">
                    <strong>Profile picture</strong>
                    <p>Use a JPG, PNG, or WebP image up to 2 MB.</p>
                    <div className="pkb-settings-inline-actions">
                      <label className={`pkb-secondary-button pkb-picture-upload ${avatarSaving ? "disabled" : ""}`}>
                        <Camera size={15} />
                        {avatarSaving ? "Uploading..." : profileAvatarUrl ? "Change picture" : "Upload picture"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePicture} disabled={avatarSaving} />
                      </label>
                      {profileAvatarUrl && (
                        <button type="button" className="pkb-settings-danger-link" onClick={removeProfilePicture}>
                          Remove picture
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile}>
                  <label className="pkb-form-label" htmlFor="pkb-profile-name">Full name</label>
                  <div className="pkb-settings-input-wrap">
                    <UserRound size={17} />
                    <input id="pkb-profile-name" className="pkb-form-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={100} required />
                  </div>

                  <label className="pkb-form-label" htmlFor="pkb-profile-email">Email address</label>
                  <div className="pkb-settings-input-wrap">
                    <Mail size={17} />
                    <input id="pkb-profile-email" className="pkb-form-input" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} maxLength={254} required />
                  </div>

                  {profileFormError && <div className="pkb-form-error">{profileFormError}</div>}

                  <div className="pkb-modal-actions">
                    <button type="submit" className="pkb-primary-button" disabled={profileSaving}>
                      {profileSaving ? <LoaderCircle className="pkb-spinner" size={17} /> : <Save size={17} />}
                      {profileSaving ? "Saving profile..." : "Save profile"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="pkb-settings-card">
                <div className="pkb-settings-card-heading">
                  <div className="pkb-settings-heading-icon"><LockKeyhole size={20} /></div>
                  <div>
                    <h2>Password & security</h2>
                    <p>Change your password using your current password for verification.</p>
                  </div>
                </div>

                <form onSubmit={changePassword}>
                  <label className="pkb-form-label" htmlFor="pkb-current-password">Current password</label>
                  <input id="pkb-current-password" className="pkb-form-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />

                  <label className="pkb-form-label" htmlFor="pkb-new-password">New password</label>
                  <input id="pkb-new-password" className="pkb-form-input" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />

                  <label className="pkb-form-label" htmlFor="pkb-confirm-password">Confirm new password</label>
                  <input id="pkb-confirm-password" className="pkb-form-input" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />

                  <p className="pkb-settings-hint">Use at least 8 characters. Your current password is required to authorize this change.</p>

                  {passwordError && <div className="pkb-form-error">{passwordError}</div>}

                  <div className="pkb-modal-actions">
                    <button type="submit" className="pkb-primary-button" disabled={passwordSaving}>
                      {passwordSaving ? <LoaderCircle className="pkb-spinner" size={17} /> : <LockKeyhole size={16} />}
                      {passwordSaving ? "Updating password..." : "Change password"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="pkb-settings-card pkb-settings-preferences-card">
                <div className="pkb-settings-card-heading">
                  <div className="pkb-settings-heading-icon"><Settings size={20} /></div>
                  <div>
                    <h2>Workspace preferences</h2>
                    <p>Choose how this browser opens your workspace.</p>
                  </div>
                </div>
<label className="pkb-form-label" htmlFor="pkb-theme">
  Appearance theme
</label>

<select
  id="pkb-theme"
  className="pkb-form-input"
  value={theme}
  onChange={(event) => {
  const selectedTheme = event.target.value;

  setTheme(selectedTheme);
  localStorage.setItem("pkb-theme", selectedTheme);

  window.dispatchEvent(new Event("pkb-theme-change"));
}}
>
  <option value="paper">📖 Paper & Ink</option>
  <option value="midnight">🌙 Midnight Scholar</option>
  <option value="forest">🌿 Forest Library</option>
</select>

<p className="pkb-settings-hint">
  Personalize your knowledge workspace with your preferred colors.
</p>

                <label className="pkb-form-label" htmlFor="pkb-default-page">Default landing page</label>
                <select id="pkb-default-page" className="pkb-form-input" value={defaultLandingPage} onChange={(event) => updateDefaultLandingPage(event.target.value)}>
                  <option value="Overview">Overview</option>
                  <option value="Notes">My Notes</option>
                  <option value="Favorites">Favorites</option>
                  <option value="Bookmarks">Bookmarks</option>
                  <option value="Activity">Activity</option>
                </select>

                <div className="pkb-settings-toggle-row">
                  <div>
                    <strong>Compact cards</strong>
                    <p>Reduce padding in notes, bookmarks, and tags.</p>
                  </div>
                  <label className="pkb-switch">
                    <input type="checkbox" checked={compactMode} onChange={(event) => updateCompactMode(event.target.checked)} />
                    <span />
                  </label>
                </div>

                <p className="pkb-settings-hint">Workspace preferences are saved in this browser on this device.</p>
              </section>

              {profileError && (
                <div className="pkb-settings-global-error">
                  <ShieldAlert size={17} />
                  <span>{profileError}</span>
                  <button type="button" onClick={() => setProfileError("")}>Dismiss</button>
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div
  className={`pkb-app ${compactMode ? "pkb-compact" : ""}`}
  data-theme={theme}
>
      <aside
        className={`pkb-sidebar ${
          sidebarOpen ? "pkb-sidebar-open" : ""
        }`}
      >
        <button
          type="button"
          className="pkb-brand"
          onClick={() => navigateTo("Overview")}
        >
          <span className="pkb-brand-icon">
            <BookOpen size={23} />
          </span>

          <span>
            <strong>Knowledge</strong>
            <small>PERSONAL WORKSPACE</small>
          </span>
        </button>

        <div className="pkb-sidebar-label">WORKSPACE</div>

        <nav className="pkb-nav">
          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Overview" ? "active" : ""
            }`}
            onClick={() => navigateTo("Overview")}
          >
            <Home size={19} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Notes" ? "active" : ""
            }`}
            onClick={() => navigateTo("Notes")}
          >
            <FileText size={19} />
            <span>My Notes</span>
            <span className="pkb-nav-count">
              {notesLoading ? "—" : notes.length}
            </span>
          </button>

          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Bookmarks" ? "active" : ""
            }`}
            onClick={() => navigateTo("Bookmarks")}
          >
            <Bookmark size={19} />
            <span>Bookmarks</span>
            <span className="pkb-nav-count">
              {bookmarksLoading ? "—" : bookmarks.length}
            </span>
          </button>

          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Favorites" ? "active" : ""
            }`}
            onClick={() => navigateTo("Favorites")}
          >
            <Heart size={19} />
            <span>Favorites</span>
            <span className="pkb-nav-count">
              {notesLoading || bookmarksLoading
                ? "—"
                : totalFavorites}
            </span>
          </button>
        </nav>

        <div className="pkb-folder-heading">
          <span className="pkb-sidebar-label">YOUR FOLDERS</span>

          <button
            type="button"
            className="pkb-folder-add"
            title="Create folder"
            aria-label="Create folder"
            onClick={() => openFolderEditor()}
          >
            <FolderPlus size={17} />
          </button>
        </div>

        {foldersLoading ? (
          <div className="pkb-folder-status">
            <LoaderCircle className="pkb-spinner" size={15} />
            Loading folders...
          </div>
        ) : foldersError ? (
          <div className="pkb-folder-error">
            <span>{foldersError}</span>
            <button type="button" onClick={loadFolders}>
              Retry
            </button>
          </div>
        ) : folders.length === 0 ? (
          <div className="pkb-no-folders">
            <p>No folders yet.</p>
            <button
              type="button"
              onClick={() => openFolderEditor()}
            >
              <Plus size={14} />
              Create your first folder
            </button>
          </div>
        ) : (
          <div className="pkb-folder-list">
            {folders.map((folder) => {
              const selected =
                activePage === `Folder:${folder.id}`;

              return (
                <div
                  className={`pkb-folder-row ${
                    selected ? "active" : ""
                  }`}
                  key={folder.id}
                >
                  <button
                    type="button"
                    className="pkb-folder-select"
                    onClick={() =>
                      navigateTo(`Folder:${folder.id}`)
                    }
                    title={folder.name}
                  >
                    <Folder size={17} />
                    <span>{folder.name}</span>
                    <span className="pkb-folder-count">
                      {folder.noteCount}
                    </span>
                  </button>

                  <div className="pkb-folder-actions">
                    <button
                      type="button"
                      title="Rename folder"
                      aria-label={`Rename ${folder.name}`}
                      onClick={() => openFolderEditor(folder)}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      title="Delete folder"
                      aria-label={`Delete ${folder.name}`}
                      disabled={deletingFolderId === folder.id}
                      onClick={() => deleteFolder(folder)}
                    >
                      {deletingFolderId === folder.id ? (
                        <LoaderCircle
                          className="pkb-spinner"
                          size={13}
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pkb-folder-heading">
          <span className="pkb-sidebar-label">YOUR TAGS</span>

          <button
            type="button"
            className="pkb-folder-add"
            title="Create tag"
            aria-label="Create tag"
            onClick={() => openTagEditor()}
          >
            <Plus size={17} />
          </button>
        </div>

        {tagsLoading ? (
          <div className="pkb-folder-status">
            <LoaderCircle className="pkb-spinner" size={15} />
            Loading tags...
          </div>
        ) : tagsError ? (
          <div className="pkb-folder-error">
            <span>{tagsError}</span>
            <button type="button" onClick={loadTags}>
              Retry
            </button>
          </div>
        ) : tags.length === 0 ? (
          <div className="pkb-no-folders">
            <p>No tags yet.</p>
            <button
              type="button"
              onClick={() => openTagEditor()}
            >
              <Plus size={14} />
              Create your first tag
            </button>
          </div>
        ) : (
          <div className="pkb-folder-list">
            {tags.map((tag) => {
              const selected = activePage === `Tag:${tag.id}`;

              return (
                <div
                  className={`pkb-folder-row ${
                    selected ? "active" : ""
                  }`}
                  key={tag.id}
                >
                  <button
                    type="button"
                    className="pkb-folder-select"
                    onClick={() => navigateTo(`Tag:${tag.id}`)}
                    title={tag.name}
                  >
                    <Tag size={16} />
                    <span>{tag.name}</span>
                    <span className="pkb-folder-count">
                      {tag.noteCount}
                    </span>
                  </button>

                  <div className="pkb-folder-actions">
                    <button
                      type="button"
                      title="Rename tag"
                      aria-label={`Rename ${tag.name}`}
                      onClick={() => openTagEditor(tag)}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      title="Delete tag"
                      aria-label={`Delete ${tag.name}`}
                      disabled={deletingTagId === tag.id}
                      onClick={() => deleteTag(tag)}
                    >
                      {deletingTagId === tag.id ? (
                        <LoaderCircle
                          className="pkb-spinner"
                          size={13}
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pkb-sidebar-label pkb-tools-label">
          TOOLS
        </div>

        <nav className="pkb-nav">
          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Activity" ? "active" : ""
            }`}
            onClick={() => navigateTo("Activity")}
          >
            <Activity size={19} />
            <span>Activity</span>
          </button>

          <button
            type="button"
            className={`pkb-nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => navigateTo("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="pkb-sidebar-bottom">
          <div className="pkb-plan-card">
            <div className="pkb-plan-icon">
              <Sparkles size={19} />
            </div>

            <strong>Your knowledge grows here</strong>
            <p>Keep your ideas organized in one place.</p>

            <button
              type="button"
              onClick={() => openNoteEditor()}
            >
              Create a note <ArrowUpRight size={15} />
            </button>
          </div>

          <button
            type="button"
            className="pkb-profile"
            onClick={() => navigateTo("Settings")}
            title="Open profile settings"
          >
            <span className="pkb-avatar">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="Profile" />
              ) : (
                firstName.charAt(0).toUpperCase()
              )}
            </span>

            <span className="pkb-profile-info">
              <strong>
                {user.fullName ||
                  user.full_name ||
                  user.name ||
                  "User"}
              </strong>
              <small>{user.email || "Signed in"}</small>
            </span>

            <Settings size={17} />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="pkb-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="pkb-main">
        <header className="pkb-topbar">
          <div className="pkb-topbar-left">
            <button
              type="button"
              className="pkb-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="pkb-breadcrumb">
              <span>Workspace</span>
              <span className="pkb-breadcrumb-separator">/</span>
              <strong>
                {currentFolder
                  ? currentFolder.name
                  : currentTag
                    ? currentTag.name
                    : activePage}
              </strong>
            </div>
          </div>

          <div className="pkb-topbar-actions">
            <label className="pkb-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Search your knowledge..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
              />

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <button
              type="button"
              className="pkb-topbar-add"
              onClick={() => openNoteEditor()}
              title="Create a note"
              aria-label="Create a note"
            >
              <Plus size={20} />
            </button>

            <button
              type="button"
              className="pkb-topbar-user"
              onClick={() => navigateTo("Settings")}
              title="Open profile settings"
              aria-label="Open profile settings"
            >
              <span className="pkb-avatar">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="Profile" />
                ) : (
                  firstName.charAt(0).toUpperCase()
                )}
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <div className="pkb-page-content">
          {renderCurrentPage()}
        </div>

        <footer className="pkb-footer">
          <span>
            <ShieldAlert size={14} />
            Your personal knowledge, organized.
          </span>
          <span>Personal Knowledge Base</span>
        </footer>
      </main>

      {showNoteEditor && (
        <div
          className="pkb-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNoteEditor();
            }
          }}
        >
          <section
            className="pkb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkb-note-modal-title"
          >
            <div className="pkb-modal-header">
              <div>
                <span className="pkb-eyebrow">
                  <FileText size={15} />
                  YOUR KNOWLEDGE BASE
                </span>

                <h2 id="pkb-note-modal-title">
                  {editingNoteId !== null
                    ? "Edit note"
                    : "Create a note"}
                </h2>
              </div>

              <button
                type="button"
                className="pkb-icon-button"
                onClick={closeNoteEditor}
                aria-label="Close note editor"
                disabled={noteSaving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveNote}>
              <label
                className="pkb-form-label"
                htmlFor="pkb-note-title"
              >
                Note title
              </label>

              <input
                id="pkb-note-title"
                className="pkb-form-input"
                value={noteTitle}
                onChange={(event) =>
                  setNoteTitle(event.target.value)
                }
                placeholder="Give your note a title"
                maxLength={200}
                required
                autoFocus
              />

              <label
                className="pkb-form-label"
                htmlFor="pkb-note-category"
              >
                Category
              </label>

              <select
                id="pkb-note-category"
                className="pkb-form-input"
                value={noteCategory}
                onChange={(event) =>
                  setNoteCategory(event.target.value)
                }
              >
                {noteCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label
                className="pkb-form-label"
                htmlFor="pkb-note-folder"
              >
                Folder
              </label>

              <select
                id="pkb-note-folder"
                className="pkb-form-input"
                value={selectedFolderId}
                onChange={(event) =>
                  setSelectedFolderId(event.target.value)
                }
              >
                <option value="">No folder</option>

                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              <div className="pkb-tag-picker">
                <div className="pkb-tag-picker-heading">
                  <label className="pkb-form-label">
                    Tags
                  </label>

                  <button
                    type="button"
                    className="pkb-inline-add"
                    onClick={() => openTagEditor()}
                  >
                    <Plus size={14} />
                    Create tag
                  </button>
                </div>

                {tagsLoading ? (
                  <div className="pkb-tag-picker-empty">
                    Loading tags...
                  </div>
                ) : tags.length === 0 ? (
                  <div className="pkb-tag-picker-empty">
                    No tags available. Create a tag to get started.
                  </div>
                ) : (
                  <div className="pkb-tag-checkboxes">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={`pkb-tag-option ${
                          selectedTagIds.includes(tag.id)
                            ? "selected"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={() =>
                            toggleSelectedTag(tag.id)
                          }
                        />
                        <Tag size={13} />
                        <span>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label
                className="pkb-form-label"
                htmlFor="pkb-note-content"
              >
                Content
              </label>

              <RichTextEditor
                value={noteContent}
                onChange={(value) => {
                  setNoteContent(value);
                  setNoteInsights(null);
                  setNoteInsightsError("");
                }}
              />

              <div className="pkb-note-insights">
                <div className="pkb-note-insights-header">
                  <div className="pkb-note-insights-heading">
                    <span className="pkb-note-insights-eyebrow">
                      <Sparkles size={15} />
                      AI-POWERED
                    </span>
                    <h3>AI Insights</h3>
                    <p>Get a summary and personalized suggestions for your note.</p>
                  </div>
                  <button
                    type="button"
                    className="pkb-note-insights-button"
                    onClick={generateNoteInsights}
                    disabled={noteInsightsLoading || String(noteContent || "").replace(/<[^>]*>/g, " ").trim().length < 20}
                  >
                    {noteInsightsLoading ? (
                      <><LoaderCircle className="pkb-spinner" size={16} />Generating...</>
                    ) : (
                      <><Sparkles size={16} />{noteInsights ? "Regenerate" : "Generate insights"}</>
                    )}
                  </button>
                </div>

                {noteInsightsError && <div className="pkb-note-insights-error" role="alert">{noteInsightsError}</div>}

                {noteInsightsLoading && (
                  <div className="pkb-note-insights-loading">
                    <LoaderCircle className="pkb-spinner" size={20} />
                    <div><strong>Analyzing your note...</strong><p>Preparing your summary, suggestions, and relevant tags.</p></div>
                  </div>
                )}

                {!noteInsights && !noteInsightsLoading && !noteInsightsError && (
                  <div className="pkb-note-insights-empty">
                    <Sparkles size={20} />
                    <div><strong>Your personal AI assistant</strong><p>Write your note and select Generate insights to get started.</p></div>
                  </div>
                )}

                {noteInsights && !noteInsightsLoading && (
                  <div className="pkb-note-insights-results">
                    <section className="pkb-note-insights-section">
                      <div className="pkb-note-insights-section-heading"><FileText size={17} /><h4>AI Summary</h4></div>
                      <p className="pkb-note-insights-summary">{noteInsights.summary}</p>
                    </section>
                    <section className="pkb-note-insights-section">
                      <div className="pkb-note-insights-section-heading"><Sparkles size={17} /><h4>Suggestions for you</h4></div>
                      {noteInsights.suggestions.length ? (
                        <ul className="pkb-note-insights-suggestions">
                          {noteInsights.suggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}><span className="pkb-note-insights-bullet"><Check size={13} /></span><span>{suggestion}</span></li>)}
                        </ul>
                      ) : <p>No suggestions are available for this note.</p>}
                    </section>
                    <section className="pkb-note-insights-section">
                      <div className="pkb-note-insights-section-heading"><Tag size={17} /><h4>Suggested tags</h4></div>
                      {noteInsights.suggestedTags.length ? (
                        <div className="pkb-note-insights-tags">
                          {noteInsights.suggestedTags.map((tag, index) => <span key={`${index}-${tag}`} className="pkb-note-insights-tag"><Tag size={12} />{tag}</span>)}
                        </div>
                      ) : <p>No relevant tags were suggested.</p>}
                    </section>
                  </div>
                )}
              </div>

              {editingNoteId !== null && (
                <div className="pkb-note-history-actions">
                  <span>Need an earlier version?</span>
                  <button
                    type="button"
                    className="pkb-secondary-button"
                    onClick={openVersionHistory}
                  >
                    <Clock3 size={16} />
                    Version history
                  </button>
                </div>
              )}

              {editingNoteId !== null && (
                <NoteAttachments
                  noteId={editingNoteId}
                  notify={notify}
                />
              )}

              {editingNoteId === null && (
                <p className="pkb-attachment-hint">
                  Save this note first, then reopen it to attach files or view version history.
                </p>
              )}
              {operationError && (
                <div className="pkb-form-error">
                  {operationError}
                </div>
              )}

              <div className="pkb-modal-actions">
                <button
                  type="button"
                  className="pkb-secondary-button"
                  onClick={closeNoteEditor}
                  disabled={noteSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pkb-primary-button"
                  disabled={noteSaving}
                >
                  {noteSaving ? (
                    <>
                      <LoaderCircle
                        className="pkb-spinner"
                        size={17}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      {editingNoteId !== null
                        ? "Save changes"
                        : "Save note"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showVersionHistory && (
        <div
          className="pkb-modal-backdrop pkb-version-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeVersionHistory();
            }
          }}
        >
          <section
            className="pkb-modal pkb-version-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkb-version-history-title"
          >
            <div className="pkb-modal-header">
              <div>
                <span className="pkb-eyebrow">
                  <Clock3 size={15} />
                  NOTE HISTORY
                </span>
                <h2 id="pkb-version-history-title">Version history</h2>
                <p className="pkb-version-subtitle">
                  Review previous saved versions and restore one when needed.
                </p>
              </div>
              <button
                type="button"
                className="pkb-icon-button"
                onClick={closeVersionHistory}
                aria-label="Close version history"
                disabled={restoringVersionId !== null}
              >
                <X size={20} />
              </button>
            </div>

            {versionsError && (
              <div className="pkb-form-error pkb-version-error">
                <span>{versionsError}</span>
                <button
                  type="button"
                  className="pkb-secondary-button"
                  onClick={() => loadNoteVersions(editingNoteId)}
                  disabled={versionsLoading || restoringVersionId !== null}
                >
                  Retry
                </button>
              </div>
            )}

            {versionsLoading ? (
              <div className="pkb-loading pkb-version-loading">
                <LoaderCircle className="pkb-spinner" size={22} />
                Loading previous versions...
              </div>
            ) : noteVersions.length === 0 && !versionsError ? (
              <div className="pkb-empty pkb-version-empty">
                <div className="pkb-empty-icon">
                  <Clock3 size={25} />
                </div>
                <h3>No saved versions yet</h3>
                <p>
                  A previous version appears here after the note has been edited and saved.
                </p>
              </div>
            ) : (
              <div className="pkb-version-list">
                {noteVersions.map((version, index) => (
                  <article className="pkb-version-card" key={version.id}>
                    <div className="pkb-version-card-heading">
                      <div className="pkb-version-heading-main">
                        <span className="pkb-version-number">
                          {index === 0 ? "Latest saved version" : `Version ${noteVersions.length - index}`}
                        </span>
                        <h3>{version.title}</h3>
                        <time>{formatActivityTimestamp(version.createdAt)}</time>
                      </div>
                      <button
                        type="button"
                        className="pkb-primary-button pkb-version-restore"
                        disabled={restoringVersionId !== null}
                        onClick={() => restoreNoteVersion(version)}
                      >
                        {restoringVersionId === version.id ? (
                          <>
                            <LoaderCircle className="pkb-spinner" size={15} />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={15} />
                            Restore
                          </>
                        )}
                      </button>
                    </div>
                    <div className="pkb-version-content">
                      <RichTextContent
                        content={version.content || "No content in this version."}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="pkb-modal-actions">
              <button
                type="button"
                className="pkb-secondary-button"
                onClick={closeVersionHistory}
                disabled={restoringVersionId !== null}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showFolderEditor && (
        <div
          className="pkb-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFolderEditor();
            }
          }}
        >
          <section
            className="pkb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkb-folder-modal-title"
          >
            <div className="pkb-modal-header">
              <div>
                <span className="pkb-eyebrow">
                  <Folder size={15} />
                  FOLDER MANAGEMENT
                </span>

                <h2 id="pkb-folder-modal-title">
                  {editingFolderId !== null
                    ? "Rename folder"
                    : "Create a folder"}
                </h2>
              </div>

              <button
                type="button"
                className="pkb-icon-button"
                onClick={closeFolderEditor}
                aria-label="Close folder editor"
                disabled={folderSaving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveFolder}>
              <label
                className="pkb-form-label"
                htmlFor="pkb-folder-name"
              >
                Folder name
              </label>

              <input
                id="pkb-folder-name"
                className="pkb-form-input"
                value={folderName}
                onChange={(event) =>
                  setFolderName(event.target.value)
                }
                placeholder="e.g. Work, Study, Projects"
                maxLength={100}
                required
                autoFocus
              />

              <label
                className="pkb-form-label"
                htmlFor="pkb-folder-description"
              >
                Description
              </label>

              <textarea
                id="pkb-folder-description"
                className="pkb-form-input pkb-textarea"
                value={folderDescription}
                onChange={(event) =>
                  setFolderDescription(event.target.value)
                }
                placeholder="What will you organize in this folder?"
                maxLength={1000}
                rows={4}
              />

              {operationError && (
                <div className="pkb-form-error">
                  {operationError}
                </div>
              )}

              <div className="pkb-modal-actions">
                <button
                  type="button"
                  className="pkb-secondary-button"
                  onClick={closeFolderEditor}
                  disabled={folderSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pkb-primary-button"
                  disabled={folderSaving}
                >
                  {folderSaving ? (
                    <>
                      <LoaderCircle
                        className="pkb-spinner"
                        size={17}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      {editingFolderId !== null
                        ? "Save changes"
                        : "Create folder"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showTagEditor && (
        <div
          className="pkb-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTagEditor();
            }
          }}
        >
          <section
            className="pkb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkb-tag-modal-title"
          >
            <div className="pkb-modal-header">
              <div>
                <span className="pkb-eyebrow">
                  <Tag size={15} />
                  TAG MANAGEMENT
                </span>

                <h2 id="pkb-tag-modal-title">
                  {editingTagId !== null
                    ? "Rename tag"
                    : "Create a tag"}
                </h2>
              </div>

              <button
                type="button"
                className="pkb-icon-button"
                onClick={closeTagEditor}
                aria-label="Close tag editor"
                disabled={tagSaving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveTag}>
              <label
                className="pkb-form-label"
                htmlFor="pkb-tag-name"
              >
                Tag name
              </label>

              <input
                id="pkb-tag-name"
                className="pkb-form-input"
                value={tagName}
                onChange={(event) =>
                  setTagName(event.target.value)
                }
                placeholder="e.g. Programming, Learning, Research"
                maxLength={100}
                required
                autoFocus
              />

              {operationError && (
                <div className="pkb-form-error">
                  {operationError}
                </div>
              )}

              <div className="pkb-modal-actions">
                <button
                  type="button"
                  className="pkb-secondary-button"
                  onClick={closeTagEditor}
                  disabled={tagSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pkb-primary-button"
                  disabled={tagSaving}
                >
                  {tagSaving ? (
                    <>
                      <LoaderCircle
                        className="pkb-spinner"
                        size={17}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      {editingTagId !== null
                        ? "Save changes"
                        : "Create tag"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showBookmarkEditor && (
        <div
          className="pkb-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !bookmarkSaving
            ) {
              setShowBookmarkEditor(false);
              setOperationError("");
            }
          }}
        >
          <section
            className="pkb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkb-bookmark-modal-title"
          >
            <div className="pkb-modal-header">
              <div>
                <span className="pkb-eyebrow">
                  <Bookmark size={15} />
                  SAVED RESOURCES
                </span>

                <h2 id="pkb-bookmark-modal-title">
                  Add a bookmark
                </h2>
              </div>

              <button
                type="button"
                className="pkb-icon-button"
                aria-label="Close bookmark editor"
                disabled={bookmarkSaving}
                onClick={() => {
                  setShowBookmarkEditor(false);
                  setOperationError("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addBookmark}>
              <label
                className="pkb-form-label"
                htmlFor="pkb-bookmark-title"
              >
                Website title
              </label>

              <input
                id="pkb-bookmark-title"
                className="pkb-form-input"
                value={bookmarkTitle}
                onChange={(event) =>
                  setBookmarkTitle(event.target.value)
                }
                placeholder="e.g. React Documentation"
                maxLength={200}
                required
                autoFocus
              />

              <label
                className="pkb-form-label"
                htmlFor="pkb-bookmark-url"
              >
                Website URL
              </label>

              <input
                id="pkb-bookmark-url"
                className="pkb-form-input"
                type="text"
                inputMode="url"
                value={bookmarkUrl}
                onChange={(event) =>
                  setBookmarkUrl(event.target.value)
                }
                placeholder="https://example.com"
                maxLength={2048}
                required
              />

              <label
                className="pkb-form-label"
                htmlFor="pkb-bookmark-description"
              >
                Description
              </label>

              <textarea
                id="pkb-bookmark-description"
                className="pkb-form-input pkb-textarea"
                value={bookmarkDescription}
                onChange={(event) =>
                  setBookmarkDescription(event.target.value)
                }
                placeholder="What would you like to remember about this website?"
                rows={4}
              />

              {operationError && (
                <div className="pkb-form-error">
                  {operationError}
                </div>
              )}

              <div className="pkb-modal-actions">
                <button
                  type="button"
                  className="pkb-secondary-button"
                  onClick={() => {
                    setShowBookmarkEditor(false);
                    setOperationError("");
                  }}
                  disabled={bookmarkSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pkb-primary-button"
                  disabled={bookmarkSaving}
                >
                  {bookmarkSaving ? (
                    <>
                      <LoaderCircle
                        className="pkb-spinner"
                        size={17}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save bookmark
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="pkb-toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <style>{`
        .pkb-app {
          --pkb-bg: #f7f8fc;
          --pkb-card: #ffffff;
          --pkb-text: #20243a;
          --pkb-muted: #777e94;
          --pkb-border: #e9ebf3;
          --pkb-primary: #6759e8;
          display: flex;
          min-height: 100vh;
          background: var(--pkb-bg);
          color: var(--pkb-text);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 14px;
        }

        .pkb-app * {
          box-sizing: border-box;
        }

        .pkb-app button,
        .pkb-app input,
        .pkb-app textarea,
        .pkb-app select {
          font: inherit;
        }

        .pkb-app button {
          cursor: pointer;
        }

        .pkb-app button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .pkb-sidebar {
          width: 258px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 27px 18px 16px;
          background: #fff;
          border-right: 1px solid var(--pkb-border);
          min-height: 100vh;
        }

        .pkb-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 8px;
          margin-bottom: 35px;
          border: 0;
          background: transparent;
          color: var(--pkb-text);
          text-align: left;
        }

        .pkb-brand-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          border-radius: 14px;
          color: white;
          background: linear-gradient(135deg, #7567f3, #5142ce);
        }

        .pkb-brand strong,
        .pkb-brand small {
          display: block;
        }

        .pkb-brand strong {
          font-size: 18px;
          letter-spacing: -0.6px;
        }

        .pkb-brand small {
          margin-top: 4px;
          color: #9398aa;
          font-size: 9px;
          letter-spacing: 1.2px;
        }

        .pkb-sidebar-label {
          padding: 0 12px;
          margin-bottom: 12px;
          color: #a0a4b5;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 1.4px;
        }

        .pkb-tools-label {
          margin-top: 26px;
        }

        .pkb-nav {
          display: grid;
          gap: 5px;
        }

        .pkb-nav-item {
          display: flex;
          align-items: center;
          gap: 13px;
          width: 100%;
          min-height: 43px;
          padding: 0 12px;
          border: 0;
          border-radius: 10px;
          color: #7b8196;
          background: transparent;
          text-align: left;
          transition: background 0.2s, color 0.2s;
        }

        .pkb-nav-item:hover {
          background: #f5f4ff;
          color: var(--pkb-primary);
        }

        .pkb-nav-item.active {
          color: #5b4dd5;
          background: #f0eeff;
          font-weight: 650;
        }

        .pkb-nav-item > span:nth-child(2) {
          flex: 1;
        }

        .pkb-nav-count {
          color: #a0a4b5;
          font-size: 12px;
        }

        .pkb-folder-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          margin-top: 25px;
        }

        .pkb-folder-heading .pkb-sidebar-label {
          margin-bottom: 12px;
        }

        .pkb-folder-add {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          margin-top: -10px;
          margin-bottom: 5px;
          border: 0;
          border-radius: 8px;
          color: #8277d9;
          background: transparent;
        }

        .pkb-folder-add:hover {
          background: #f0eeff;
          color: var(--pkb-primary);
        }

        .pkb-folder-list {
          display: grid;
          gap: 3px;
        }

        .pkb-folder-row {
          display: flex;
          align-items: center;
          min-width: 0;
          min-height: 39px;
          border-radius: 9px;
          color: #7b8196;
        }

        .pkb-folder-row:hover,
        .pkb-folder-row.active {
          color: #5b4dd5;
          background: #f5f3ff;
        }

        .pkb-folder-select {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          min-width: 0;
          min-height: 39px;
          padding: 0 8px;
          border: 0;
          color: inherit;
          background: transparent;
          text-align: left;
        }

        .pkb-folder-select > span:first-of-type {
          flex: 1;
          overflow: hidden;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pkb-folder-count {
          color: #a1a5b5;
          font-size: 11px;
        }

        .pkb-folder-actions {
          display: flex;
          padding-right: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .pkb-folder-row:hover .pkb-folder-actions,
        .pkb-folder-row.active .pkb-folder-actions {
          opacity: 1;
        }

        .pkb-folder-actions button {
          display: grid;
          place-items: center;
          width: 23px;
          height: 27px;
          padding: 0;
          border: 0;
          border-radius: 6px;
          color: #8d91a5;
          background: transparent;
        }

        .pkb-folder-actions button:hover {
          color: var(--pkb-primary);
          background: #eae6ff;
        }

        .pkb-folder-actions button:last-child:hover {
          color: #d95065;
          background: #fff0f2;
        }

        .pkb-folder-status,
        .pkb-no-folders {
          padding: 9px 10px;
          color: #9297a9;
          font-size: 11px;
          line-height: 1.7;
        }

        .pkb-folder-status {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .pkb-no-folders p {
          margin: 0 0 7px;
        }

        .pkb-no-folders button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          border: 0;
          color: var(--pkb-primary);
          background: transparent;
          font-size: 11px;
          text-align: left;
        }

        .pkb-folder-error {
          padding: 8px 10px;
          color: #c33d53;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .pkb-folder-error button {
          display: block;
          margin-top: 5px;
          padding: 4px 8px;
          border: 1px solid #ffd9dd;
          border-radius: 6px;
          color: #c33d53;
          background: white;
        }

        .pkb-sidebar-bottom {
          margin-top: auto;
          padding-top: 25px;
        }

        .pkb-plan-card {
          padding: 17px;
          border: 1px solid #e8e4ff;
          border-radius: 14px;
          background: linear-gradient(145deg, #f6f4ff, #fff);
        }

        .pkb-plan-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          margin-bottom: 13px;
          border-radius: 10px;
          color: #6d5ce8;
          background: #eae6ff;
        }

        .pkb-plan-card strong {
          display: block;
          font-size: 13px;
          line-height: 1.5;
        }

        .pkb-plan-card p {
          margin: 7px 0 13px;
          color: var(--pkb-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .pkb-plan-card button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          border: 0;
          color: var(--pkb-primary);
          background: transparent;
          font-size: 12px;
          font-weight: 650;
        }

        .pkb-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin-top: 20px;
          padding: 15px 2px 2px;
          border: 0;
          border-top: 1px solid var(--pkb-border);
          background: transparent;
          text-align: left;
          color: var(--pkb-muted);
        }

        .pkb-avatar {
          position: relative;
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 50%;
          color: #5547c9;
          background: #eeebff;
          font-weight: 750;
        }

        .pkb-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pkb-profile-info {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
          gap: 4px;
        }

        .pkb-profile-info strong {
          overflow: hidden;
          color: var(--pkb-text);
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pkb-profile-info small {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pkb-main {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
        }

        .pkb-topbar {
          position: sticky;
          z-index: 5;
          top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 78px;
          padding: 0 38px;
          border-bottom: 1px solid var(--pkb-border);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
        }

        .pkb-topbar-left,
        .pkb-breadcrumb,
        .pkb-topbar-actions {
          display: flex;
          align-items: center;
        }

        .pkb-breadcrumb {
          gap: 11px;
          color: #969bad;
          font-size: 13px;
        }

        .pkb-breadcrumb strong {
          color: var(--pkb-text);
          font-weight: 650;
        }

        .pkb-breadcrumb-separator {
          color: #c5c8d5;
        }

        .pkb-topbar-actions {
          gap: 14px;
        }

        .pkb-search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(340px, 35vw);
          height: 42px;
          padding: 0 12px;
          border: 1px solid var(--pkb-border);
          border-radius: 10px;
          color: #989caf;
          background: #fbfbfe;
        }

        .pkb-search:focus-within {
          border-color: #aaa0ff;
          box-shadow: 0 0 0 3px #6e5ee912;
        }

        .pkb-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: var(--pkb-text);
          background: transparent;
          font-size: 12px;
        }

        .pkb-search input::placeholder {
          color: #a4a8b8;
        }

        .pkb-search button,
        .pkb-topbar-user,
        .pkb-topbar-add,
        .pkb-mobile-menu {
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
        }

        .pkb-search button {
          padding: 2px;
          color: var(--pkb-muted);
        }

        .pkb-topbar-add {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          color: white;
          background: var(--pkb-primary);
        }

        .pkb-topbar-add:hover,
        .pkb-primary-button:hover {
          background: #5748d4;
        }

        .pkb-topbar-user {
          display: flex;
          gap: 7px;
          color: #858ba0;
        }

        .pkb-mobile-menu {
          display: none;
          color: var(--pkb-text);
        }

        .pkb-page-content {
          flex: 1;
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 35px 38px 45px;
        }

        .pkb-welcome,
        .pkb-page-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          margin-bottom: 30px;
        }

        .pkb-heading-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pkb-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 10px;
          color: #7162e7;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 1.3px;
        }

        .pkb-welcome h1,
        .pkb-page-heading h1 {
          margin: 0;
          color: #24263c;
          font-size: clamp(25px, 2.5vw, 33px);
          font-weight: 750;
          letter-spacing: -1.1px;
        }

        .pkb-welcome p,
        .pkb-page-heading p {
          margin: 9px 0 0;
          color: var(--pkb-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .pkb-folder-note-count {
          display: inline-flex;
          margin-top: 12px;
          padding: 6px 9px;
          border-radius: 7px;
          color: #6759d8;
          background: #f0eeff;
          font-size: 11px;
          font-weight: 650;
        }

        .pkb-primary-button,
        .pkb-secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          transition: background 0.2s, border-color 0.2s;
        }

        .pkb-primary-button {
          color: white;
          background: var(--pkb-primary);
          box-shadow: 0 4px 12px #6759e820;
        }

        .pkb-secondary-button {
          color: #656b81;
          border-color: #e6e8f0;
          background: white;
        }

        .pkb-secondary-button:hover {
          background: #f7f7fb;
        }

        .pkb-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 17px;
          margin-bottom: 40px;
        }

        .pkb-stat-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--pkb-border);
          border-radius: 15px;
          background: var(--pkb-card);
          text-align: left;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .pkb-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px #292d4b08;
        }

        .pkb-stat-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          margin-bottom: 17px;
          border-radius: 12px;
        }

        .pkb-stat-purple {
          color: #715ee7;
          background: #f0edff;
        }

        .pkb-stat-blue {
          color: #3982e7;
          background: #eaf3ff;
        }

        .pkb-stat-orange {
          color: #e39a40;
          background: #fff3e4;
        }

        .pkb-stat-green {
          color: #2da780;
          background: #e6f8f0;
        }

        .pkb-stat-card > span {
          color: var(--pkb-muted);
          font-size: 12px;
        }

        .pkb-stat-card > strong {
          margin: 7px 0 4px;
          color: #272a41;
          font-size: 29px;
          font-weight: 750;
          letter-spacing: -0.7px;
        }

        .pkb-stat-card > small {
          color: #a0a4b5;
          font-size: 10px;
          line-height: 1.5;
        }

        .pkb-section {
          margin-top: 36px;
        }

        .pkb-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .pkb-section-heading h2 {
          margin: 0;
          color: #292b42;
          font-size: 17px;
          font-weight: 750;
          letter-spacing: -0.3px;
        }

        .pkb-section-heading p {
          margin: 6px 0 0;
          color: #969bad;
          font-size: 12px;
        }

        .pkb-text-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 0;
          border: 0;
          color: var(--pkb-primary);
          background: transparent;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }

        .pkb-note-grid,
        .pkb-bookmark-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .pkb-bookmark-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .pkb-tag-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .pkb-note-card,
        .pkb-bookmark-card,
        .pkb-tag-card {
          min-width: 0;
          padding: 20px;
          border: 1px solid var(--pkb-border);
          border-radius: 14px;
          background: var(--pkb-card);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .pkb-note-card:hover,
        .pkb-bookmark-card:hover,
        .pkb-tag-card:hover {
          border-color: #ddd8ff;
          box-shadow: 0 8px 25px #292d4b06;
        }

        .pkb-note-card-top,
        .pkb-bookmark-card-top,
        .pkb-card-actions {
          display: flex;
          align-items: center;
        }

        .pkb-note-card-top,
        .pkb-bookmark-card-top {
          justify-content: space-between;
          gap: 10px;
        }

        .pkb-card-actions {
          gap: 4px;
        }

        .pkb-category {
          display: inline-flex;
          align-items: center;
          padding: 6px 9px;
          border-radius: 7px;
          color: #6759d8;
          background: #f0eeff;
          font-size: 10px;
          font-weight: 650;
        }

        .pkb-icon-button {
          display: grid;
          place-items: center;
          width: 31px;
          height: 31px;
          flex-shrink: 0;
          padding: 0;
          border: 0;
          border-radius: 8px;
          color: #969bad;
          background: transparent;
          transition: color 0.2s, background 0.2s;
        }

        .pkb-icon-button:hover {
          color: var(--pkb-primary);
          background: #f2f0ff;
        }

        .pkb-icon-button.is-favorite {
          color: #e7a342;
        }

        .pkb-delete-button:hover {
          color: #d95065;
          background: #fff0f2;
        }

        .pkb-note-content-button {
          display: block;
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          text-align: left;
        }

        .pkb-note-content-button h3,
        .pkb-bookmark-card h3 {
          margin: 18px 0 9px;
          overflow-wrap: anywhere;
          color: #292b42;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.5;
        }

        .pkb-note-content-button p {
          display: -webkit-box;
          min-height: 42px;
          margin: 0;
          overflow: hidden;
          color: #83899c;
          font-size: 12px;
          line-height: 1.8;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .pkb-note-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 13px;
        }

        .pkb-note-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border: 1px solid #e8e4ff;
          border-radius: 7px;
          color: #6d5bd9;
          background: #f7f5ff;
          font-size: 10px;
        }

        .pkb-note-tag:hover {
          border-color: #c9c0ff;
          background: #efecff;
        }

        .pkb-note-folder-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 12px;
          padding: 5px 8px;
          border: 0;
          border-radius: 7px;
          color: #7565d7;
          background: #f3f1ff;
          font-size: 10px;
        }

        .pkb-note-card-footer,
        .pkb-bookmark-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid #f0f1f6;
        }

        .pkb-note-card-footer > span,
        .pkb-bookmark-footer > span {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          color: #969bad;
          font-size: 10px;
        }

        .pkb-note-card-footer > button,
        .pkb-bookmark-footer > a {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          border: 0;
          color: var(--pkb-primary);
          background: transparent;
          font-size: 11px;
          font-weight: 650;
          text-decoration: none;
          white-space: nowrap;
        }

        .pkb-site-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 750;
        }

        .pkb-site-icon.blue {
          color: #397fe0;
          background: #e9f2ff;
        }

        .pkb-site-icon.orange {
          color: #df8b36;
          background: #fff0df;
        }

        .pkb-site-icon.purple {
          color: #7059dc;
          background: #efebff;
        }

        .pkb-site-icon.green {
          color: #289b78;
          background: #e5f7ee;
        }

        .pkb-bookmark-card h3 {
          margin-top: 18px;
          margin-bottom: 7px;
        }

        .pkb-bookmark-description {
          display: -webkit-box;
          min-height: 39px;
          margin: 0;
          overflow: hidden;
          color: #83899c;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .pkb-bookmark-footer > span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pkb-tag-open {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 0;
          border: 0;
          color: var(--pkb-text);
          background: transparent;
          text-align: left;
        }

        .pkb-tag-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 12px;
          color: #7059dc;
          background: #efebff;
        }

        .pkb-tag-info {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .pkb-tag-info strong {
          overflow-wrap: anywhere;
          font-size: 13px;
        }

        .pkb-tag-info small {
          color: #9297a9;
          font-size: 11px;
        }

        .pkb-tag-open > svg {
          color: #989caf;
        }

        .pkb-tag-actions {
          display: flex;
          gap: 10px;
          margin-top: 17px;
          padding-top: 13px;
          border-top: 1px solid #f0f1f6;
        }

        .pkb-tag-actions button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 0;
          border: 0;
          color: #777e94;
          background: transparent;
          font-size: 11px;
        }

        .pkb-tag-actions button:hover {
          color: var(--pkb-primary);
        }

        .pkb-tag-actions button:last-child:hover {
          color: #d95065;
        }

        .pkb-tag-picker {
          margin-top: 17px;
        }

        .pkb-tag-picker-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pkb-tag-picker-heading .pkb-form-label {
          margin-bottom: 8px;
        }

        .pkb-inline-add {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
          padding: 4px 0;
          border: 0;
          color: var(--pkb-primary);
          background: transparent;
          font-size: 11px;
        }

        .pkb-tag-picker-empty {
          padding: 11px;
          border: 1px dashed #e1dfef;
          border-radius: 9px;
          color: #9297a9;
          font-size: 11px;
          line-height: 1.6;
        }

        .pkb-tag-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 2px 0 5px;
        }

        .pkb-tag-option {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border: 1px solid #e4e6ef;
          border-radius: 8px;
          color: #777e94;
          background: #fff;
          cursor: pointer;
          font-size: 11px;
          transition: background 0.2s, border-color 0.2s;
        }

        .pkb-tag-option.selected {
          border-color: #cfc6ff;
          color: #5b4dd5;
          background: #f2efff;
        }

        .pkb-tag-option input {
          width: 13px;
          height: 13px;
          margin: 0;
          accent-color: #6759e8;
        }

        .pkb-loading,
        .pkb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: 28px;
          border: 1px dashed #dedfec;
          border-radius: 14px;
          color: var(--pkb-muted);
          background: #fff;
          text-align: center;
        }

        .pkb-loading {
          flex-direction: row;
          gap: 12px;
          min-height: 130px;
          border-style: solid;
          font-size: 13px;
        }

        .pkb-spinner {
          animation: pkb-spin 1s linear infinite;
        }

        @keyframes pkb-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .pkb-empty-icon {
          display: grid;
          place-items: center;
          width: 54px;
          height: 54px;
          margin-bottom: 15px;
          border-radius: 16px;
          color: #7565e8;
          background: #f0edff;
        }

        .pkb-empty h3 {
          margin: 0;
          color: #2c2e44;
          font-size: 16px;
        }

        .pkb-empty p {
          max-width: 360px;
          margin: 9px 0 18px;
          color: #9297a9;
          font-size: 12px;
          line-height: 1.8;
        }

        .pkb-activity-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: -8px 0 16px;
          color: #969bad;
          font-size: 11px;
        }

        .pkb-activity-list {
          position: relative;
          display: grid;
          gap: 12px;
        }

        .pkb-activity-list::before {
          position: absolute;
          top: 24px;
          bottom: 24px;
          left: 24px;
          width: 1px;
          background: #e9e7f6;
          content: "";
        }

        .pkb-activity-item {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 15px;
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--pkb-border);
          border-radius: 13px;
          background: #fff;
        }

        .pkb-activity-icon {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          border: 4px solid #fff;
          border-radius: 14px;
          color: #6c5cde;
          background: #f0edff;
          box-sizing: content-box;
        }

        .pkb-activity-folder {
          color: #3982e7;
          background: #eaf3ff;
        }

        .pkb-activity-bookmark {
          color: #df8b36;
          background: #fff0df;
        }

        .pkb-activity-tag {
          color: #289b78;
          background: #e5f7ee;
        }

        .pkb-activity-document {
          color: #9a5acb;
          background: #f4eaff;
        }

        .pkb-activity-body {
          flex: 1;
          min-width: 0;
          padding-top: 2px;
        }

        .pkb-activity-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .pkb-activity-title-row h3 {
          margin: 0;
          color: #292b42;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.6;
        }

        .pkb-activity-title-row time {
          flex-shrink: 0;
          color: #969bad;
          font-size: 10px;
          line-height: 1.7;
        }

        .pkb-activity-subject {
          margin: 5px 0 0;
          color: #686e83;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .pkb-activity-metadata {
          margin: 6px 0 0;
          color: #969bad;
          font-size: 10px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .pkb-activity-load-more {
          display: flex;
          justify-content: center;
          padding: 22px 0 5px;
        }

        .pkb-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border: 1px solid #ffd9dd;
          border-radius: 12px;
          color: #c33d53;
          background: #fff6f7;
          font-size: 12px;
          line-height: 1.6;
        }

        .pkb-error span {
          flex: 1;
          overflow-wrap: anywhere;
        }

        .pkb-error button {
          padding: 7px 10px;
          border: 1px solid #ffd9dd;
          border-radius: 7px;
          color: #c33d53;
          background: white;
        }

        .pkb-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 17px 38px;
          border-top: 1px solid var(--pkb-border);
          color: #a0a4b5;
          background: #fff;
          font-size: 10px;
        }

        .pkb-footer span:first-child {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pkb-settings-layout {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .pkb-settings-card {
          min-width: 0;
          padding: 24px;
          border: 1px solid var(--pkb-border);
          border-radius: 15px;
          background: #fff;
        }

        .pkb-settings-profile-card {
          grid-row: span 2;
        }

        .pkb-settings-card-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 22px;
        }

        .pkb-settings-heading-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 12px;
          color: #6c5be3;
          background: #f0edff;
        }

        .pkb-settings-card-heading h2 {
          margin: 1px 0 6px;
          color: #292b42;
          font-size: 16px;
          font-weight: 750;
        }

        .pkb-settings-card-heading p {
          margin: 0;
          color: #9297a9;
          font-size: 11px;
          line-height: 1.7;
        }

        .pkb-profile-picture-area {
          display: flex;
          align-items: center;
          gap: 17px;
          margin-bottom: 22px;
          padding: 17px;
          border: 1px solid #eeeeF6;
          border-radius: 12px;
          background: #fcfcff;
        }

        .pkb-profile-picture-large {
          position: relative;
          display: grid;
          place-items: center;
          width: 88px;
          height: 88px;
          flex-shrink: 0;
          overflow: hidden;
          border: 3px solid #efedff;
          border-radius: 50%;
          color: #5c4bd4;
          background: #eae6ff;
          font-size: 29px;
          font-weight: 750;
        }

        .pkb-profile-picture-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pkb-avatar-loading {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #fff;
          background: #28234280;
        }

        .pkb-profile-picture-actions {
          min-width: 0;
        }

        .pkb-profile-picture-actions > strong {
          display: block;
          color: #33354a;
          font-size: 12px;
        }

        .pkb-profile-picture-actions > p {
          margin: 6px 0 10px;
          color: #9297a9;
          font-size: 10px;
          line-height: 1.6;
        }

        .pkb-settings-inline-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .pkb-picture-upload {
          min-height: 34px;
          padding: 0 11px;
          cursor: pointer;
        }

        .pkb-picture-upload input {
          display: none;
        }

        .pkb-picture-upload.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .pkb-settings-danger-link {
          padding: 5px 0;
          border: 0;
          color: #c94d62;
          background: transparent;
          font-size: 11px;
        }

        .pkb-settings-danger-link:hover {
          text-decoration: underline;
        }

        .pkb-settings-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .pkb-settings-input-wrap > svg {
          position: absolute;
          left: 12px;
          z-index: 1;
          color: #989caf;
          pointer-events: none;
        }

        .pkb-settings-input-wrap .pkb-form-input {
          padding-left: 38px;
        }

        .pkb-settings-hint {
          margin: 13px 0 0;
          color: #9297a9;
          font-size: 10px;
          line-height: 1.7;
        }

        .pkb-settings-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 22px;
          padding: 15px 0;
          border-top: 1px solid #f0f1f6;
          border-bottom: 1px solid #f0f1f6;
        }

        .pkb-settings-toggle-row strong {
          color: #34364a;
          font-size: 12px;
        }

        .pkb-settings-toggle-row p {
          margin: 5px 0 0;
          color: #9297a9;
          font-size: 10px;
          line-height: 1.6;
        }

        .pkb-switch {
          position: relative;
          display: inline-flex;
          width: 42px;
          height: 24px;
          flex-shrink: 0;
        }

        .pkb-switch input {
          width: 0;
          height: 0;
          opacity: 0;
        }

        .pkb-switch span {
          position: absolute;
          inset: 0;
          border-radius: 99px;
          background: #d9dbe7;
          cursor: pointer;
          transition: background 0.2s;
        }

        .pkb-switch span::before {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 3px #2222;
          content: "";
          transition: transform 0.2s;
        }

        .pkb-switch input:checked + span {
          background: #6759e8;
        }

        .pkb-switch input:checked + span::before {
          transform: translateX(18px);
        }

        .pkb-switch input:focus-visible + span {
          outline: 3px solid #6759e833;
          outline-offset: 2px;
        }

        .pkb-settings-global-error {
          display: flex;
          align-items: center;
          gap: 10px;
          grid-column: 1 / -1;
          padding: 13px;
          border: 1px solid #ffd9dd;
          border-radius: 9px;
          color: #c33d53;
          background: #fff6f7;
          font-size: 11px;
        }

        .pkb-settings-global-error span {
          flex: 1;
          overflow-wrap: anywhere;
        }

        .pkb-settings-global-error button {
          padding: 5px 8px;
          border: 1px solid #ffd9dd;
          border-radius: 6px;
          color: #c33d53;
          background: white;
        }

        .pkb-app.pkb-compact .pkb-note-card,
        .pkb-app.pkb-compact .pkb-bookmark-card,
        .pkb-app.pkb-compact .pkb-tag-card {
          padding: 13px;
        }

        .pkb-modal-backdrop {
          position: fixed;
          z-index: 30;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          overflow-y: auto;
          background: rgba(25, 26, 49, 0.45);
          backdrop-filter: blur(4px);
        }

        .pkb-modal {
          width: 100%;
          max-width: 520px;
          max-height: calc(100vh - 40px);
          padding: 26px;
          overflow-y: auto;
          border: 1px solid #eeeefa;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 25px 80px #17152c30;
        }

        .pkb-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .pkb-modal-header h2 {
          margin: 0;
          color: #292b42;
          font-size: 22px;
          letter-spacing: -0.6px;
        }

        .pkb-form-label {
          display: block;
          margin: 17px 0 8px;
          color: #4c5065;
          font-size: 12px;
          font-weight: 650;
        }

        .pkb-form-input {
          display: block;
          width: 100%;
          min-height: 43px;
          padding: 11px 12px;
          border: 1px solid #e4e6ef;
          border-radius: 9px;
          outline: 0;
          color: #282b41;
          background: #fff;
          font-size: 13px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .pkb-form-input:focus {
          border-color: #8c7ef2;
          box-shadow: 0 0 0 3px #6759e815;
        }

        .pkb-form-input::placeholder {
          color: #b0b3c1;
        }

        .pkb-textarea {
          min-height: 100px;
          resize: vertical;
          line-height: 1.7;
        }

        .pkb-form-error {
          margin-top: 15px;
          padding: 11px 12px;
          border: 1px solid #ffd9dd;
          border-radius: 8px;
          color: #c33d53;
          background: #fff6f7;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .pkb-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 25px;
        }

        .pkb-note-history-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 15px;
          padding: 13px 0 2px;
          color: #9297a9;
          font-size: 11px;
        }

        .pkb-version-backdrop {
          z-index: 40;
        }

        .pkb-version-modal {
          max-width: 680px;
        }

        .pkb-version-subtitle {
          margin: 8px 0 0;
          color: #9297a9;
          font-size: 12px;
          line-height: 1.6;
        }

        .pkb-version-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .pkb-version-error span {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .pkb-version-loading {
          min-height: 120px;
        }

        .pkb-version-empty {
          min-height: 175px;
        }

        .pkb-version-list {
          display: grid;
          gap: 13px;
          max-height: min(56vh, 560px);
          padding: 2px 3px 4px 0;
          overflow-y: auto;
        }

        .pkb-version-card {
          min-width: 0;
          padding: 16px;
          border: 1px solid #e9ebf3;
          border-radius: 12px;
          background: #fff;
        }

        .pkb-version-card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .pkb-version-heading-main {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .pkb-version-number {
          color: #6d5ce8;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .pkb-version-heading-main h3 {
          margin: 0;
          overflow-wrap: anywhere;
          color: #292b42;
          font-size: 14px;
        }

        .pkb-version-heading-main time {
          color: #9297a9;
          font-size: 10px;
        }

        .pkb-version-restore {
          min-height: 34px;
          flex-shrink: 0;
          padding: 0 10px;
          font-size: 11px;
        }

        .pkb-version-content {
          max-height: 130px;
          margin-top: 13px;
          padding: 11px 12px;
          overflow: hidden;
          border: 1px solid #f0f1f6;
          border-radius: 8px;
          color: #747b91;
          background: #fbfbfe;
          font-size: 11px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .pkb-version-content .pkb-rich-display > :first-child {
          margin-top: 0;
        }

        .pkb-version-content .pkb-rich-display > :last-child {
          margin-bottom: 0;
        }

        .pkb-version-content .pkb-rich-display h1,
        .pkb-version-content .pkb-rich-display h2,
        .pkb-version-content .pkb-rich-display h3 {
          margin: 4px 0;
          color: #34364a;
          font-size: 12px;
          line-height: 1.5;
        }

        .pkb-version-content .pkb-rich-display p {
          margin: 0 0 5px;
        }

        .pkb-version-content .pkb-rich-display ul,
        .pkb-version-content .pkb-rich-display ol {
          margin: 4px 0;
          padding-left: 20px;
        }

        .pkb-version-content .pkb-rich-display blockquote {
          margin: 4px 0;
          padding-left: 9px;
          border-left: 2px solid #b6abff;
        }

        .pkb-toast {
          position: fixed;
          z-index: 50;
          right: 24px;
          bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: min(420px, calc(100vw - 32px));
          padding: 14px 16px;
          border: 1px solid #d9f1e4;
          border-radius: 12px;
          color: #237b57;
          background: white;
          box-shadow: 0 12px 40px #20243a15;
          font-size: 12px;
          line-height: 1.6;
        }

        .pkb-toast span {
          flex: 1;
          overflow-wrap: anywhere;
        }

        .pkb-toast button {
          display: grid;
          place-items: center;
          padding: 2px;
          border: 0;
          color: #7e9b8c;
          background: transparent;
        }

        .pkb-sidebar-overlay {
          display: none;
        }

        @media (max-width: 1200px) {
          .pkb-sidebar {
            width: 235px;
          }

          .pkb-topbar {
            padding-right: 25px;
            padding-left: 25px;
          }

          .pkb-page-content {
            padding-right: 25px;
            padding-left: 25px;
          }

          .pkb-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pkb-bookmark-grid,
          .pkb-tag-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .pkb-settings-layout {
            grid-template-columns: 1fr;
          }

          .pkb-settings-profile-card {
            grid-row: auto;
          }

          .pkb-sidebar {
            position: fixed;
            z-index: 25;
            top: 0;
            bottom: 0;
            left: 0;
            width: 270px;
            min-height: 0;
            overflow-y: auto;
            transform: translateX(-105%);
            transition: transform 0.25s ease;
          }

          .pkb-sidebar.pkb-sidebar-open {
            transform: translateX(0);
          }

          .pkb-sidebar-overlay {
            position: fixed;
            z-index: 20;
            inset: 0;
            display: block;
            border: 0;
            background: rgba(20, 21, 40, 0.35);
          }

          .pkb-mobile-menu {
            display: grid;
            margin-right: 12px;
          }

          .pkb-topbar {
            min-height: 68px;
          }

          .pkb-note-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .pkb-settings-card {
            padding: 16px;
          }

          .pkb-profile-picture-area {
            align-items: flex-start;
            flex-direction: column;
          }

          .pkb-topbar {
            gap: 10px;
            padding: 0 15px;
          }

          .pkb-breadcrumb {
            gap: 6px;
            font-size: 11px;
          }

          .pkb-topbar-actions {
            gap: 8px;
          }

          .pkb-search {
            width: min(42vw, 200px);
            height: 38px;
            gap: 6px;
            padding: 0 8px;
          }

          .pkb-search input {
            font-size: 11px;
          }

          .pkb-topbar-add {
            width: 36px;
            height: 36px;
          }

          .pkb-topbar-user .pkb-avatar {
            width: 32px;
            height: 32px;
          }

          .pkb-topbar-user > svg {
            display: none;
          }

          .pkb-page-content {
            padding: 25px 15px 35px;
          }

          .pkb-welcome,
          .pkb-page-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 17px;
          }

          .pkb-heading-actions {
            width: 100%;
          }

          .pkb-welcome h1,
          .pkb-page-heading h1 {
            font-size: 26px;
          }

          .pkb-stat-grid {
            gap: 10px;
            margin-bottom: 30px;
          }

          .pkb-stat-card {
            padding: 15px;
          }

          .pkb-stat-icon {
            width: 37px;
            height: 37px;
            margin-bottom: 13px;
          }

          .pkb-stat-card > strong {
            font-size: 25px;
          }

          .pkb-stat-card > small {
            font-size: 9px;
          }

          .pkb-bookmark-grid,
          .pkb-tag-grid {
            grid-template-columns: 1fr;
          }

          .pkb-note-card,
          .pkb-bookmark-card,
          .pkb-tag-card {
            padding: 16px;
          }

          .pkb-activity-item {
            gap: 10px;
            padding: 13px;
          }

          .pkb-activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }

          .pkb-activity-title-row {
            flex-direction: column;
            gap: 3px;
          }

          .pkb-activity-summary {
            align-items: flex-start;
            flex-direction: column;
          }

          .pkb-footer {
            align-items: flex-start;
            flex-direction: column;
            padding: 15px;
          }

          .pkb-modal {
            padding: 20px;
          }

          .pkb-note-history-actions {
            align-items: flex-start;
            flex-direction: column;
          }

          .pkb-version-card-heading {
            flex-direction: column;
          }

          .pkb-version-restore {
            width: 100%;
          }

          .pkb-version-list {
            max-height: 52vh;
          }

          .pkb-toast {
            right: 16px;
            bottom: 16px;
          }
        }
                  .pkb-app[data-theme="paper"] {
          --pkb-bg: #f5f1e8;
          --pkb-card: #fffdf8;
          --pkb-text: #292d28;
          --pkb-muted: #747a70;
          --pkb-border: #e5dfd3;
          --pkb-primary: #a95f43;
          --pkb-primary-deep: #79422f;
          --pkb-sidebar-bg: #fbf8f1;
          --pkb-topbar-bg: rgba(251, 248, 241, 0.96);
          --pkb-control-bg: #fffdf8;
          --pkb-soft: #f3e6db;
          --pkb-soft-hover: #eddbce;
          --pkb-surface-raised: #fffaf2;
          --pkb-shadow: 0 12px 35px rgba(67, 47, 32, 0.055);
        }

        .pkb-app[data-theme="midnight"] {
          --pkb-bg: #111722;
          --pkb-card: #1a2330;
          --pkb-text: #edf1f7;
          --pkb-muted: #a0adbd;
          --pkb-border: #303b4b;
          --pkb-primary: #a99bff;
          --pkb-primary-deep: #7668d9;
          --pkb-sidebar-bg: #151d28;
          --pkb-topbar-bg: rgba(21, 29, 40, 0.96);
          --pkb-control-bg: #202a38;
          --pkb-soft: #302d4a;
          --pkb-soft-hover: #3b3658;
          --pkb-surface-raised: #202a38;
          --pkb-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
        }

        .pkb-app[data-theme="forest"] {
          --pkb-bg: #edf2e9;
          --pkb-card: #fbfdf8;
          --pkb-text: #29392e;
          --pkb-muted: #718073;
          --pkb-border: #dbe4d7;
          --pkb-primary: #356a4a;
          --pkb-primary-deep: #254e36;
          --pkb-sidebar-bg: #f5f8f1;
          --pkb-topbar-bg: rgba(245, 248, 241, 0.96);
          --pkb-control-bg: #fbfdf8;
          --pkb-soft: #e4efe1;
          --pkb-soft-hover: #d5e5d2;
          --pkb-surface-raised: #f6faf2;
          --pkb-shadow: 0 12px 35px rgba(35, 66, 43, 0.06);
        }

        .pkb-app {
          background: var(--pkb-bg);
          color: var(--pkb-text);
          transition: background-color 220ms ease, color 220ms ease;
        }

        .pkb-app .pkb-sidebar {
          background: var(--pkb-sidebar-bg);
          border-color: var(--pkb-border);
          transition: background-color 220ms ease, border-color 220ms ease;
        }

        .pkb-app .pkb-topbar {
          background: var(--pkb-topbar-bg);
          border-color: var(--pkb-border);
          transition: background-color 220ms ease, border-color 220ms ease;
        }

        .pkb-app .pkb-brand,
        .pkb-app .pkb-breadcrumb strong,
        .pkb-app .pkb-profile-info strong,
        .pkb-app .pkb-welcome h1,
        .pkb-app .pkb-page-heading h1,
        .pkb-app .pkb-stat-card > strong,
        .pkb-app .pkb-note-card h3,
        .pkb-app .pkb-bookmark-card h3,
        .pkb-app .pkb-tag-card h3,
        .pkb-app .pkb-folder-card h3,
        .pkb-app .pkb-settings-card-heading h2,
        .pkb-app .pkb-settings-toggle-row strong,
        .pkb-app .pkb-profile-picture-actions > strong,
        .pkb-app .pkb-activity-title-row h3,
        .pkb-app .pkb-empty h3,
        .pkb-app .pkb-modal-header h2 {
          color: var(--pkb-text);
        }

        .pkb-app .pkb-sidebar-label,
        .pkb-app .pkb-nav-item,
        .pkb-app .pkb-folder-row,
        .pkb-app .pkb-breadcrumb,
        .pkb-app .pkb-welcome p,
        .pkb-app .pkb-page-heading p,
        .pkb-app .pkb-stat-card > span,
        .pkb-app .pkb-stat-card > small,
        .pkb-app .pkb-note-card p,
        .pkb-app .pkb-bookmark-card p,
        .pkb-app .pkb-tag-card p,
        .pkb-app .pkb-settings-card-heading p,
        .pkb-app .pkb-settings-hint,
        .pkb-app .pkb-settings-toggle-row p,
        .pkb-app .pkb-profile-picture-actions > p,
        .pkb-app .pkb-activity-subject,
        .pkb-app .pkb-activity-metadata,
        .pkb-app .pkb-activity-title-row time,
        .pkb-app .pkb-empty p,
        .pkb-app .pkb-footer {
          color: var(--pkb-muted);
        }

        .pkb-app .pkb-nav-item:hover,
        .pkb-app .pkb-nav-item.active,
        .pkb-app .pkb-folder-row:hover,
        .pkb-app .pkb-folder-row.active {
          color: var(--pkb-primary);
          background: var(--pkb-soft);
        }

        .pkb-app .pkb-plan-card,
        .pkb-app .pkb-settings-card,
        .pkb-app .pkb-stat-card,
        .pkb-app .pkb-note-card,
        .pkb-app .pkb-bookmark-card,
        .pkb-app .pkb-tag-card,
        .pkb-app .pkb-folder-card,
        .pkb-app .pkb-activity-item,
        .pkb-app .pkb-modal,
        .pkb-app .pkb-profile-picture-area {
          color: var(--pkb-text);
          background: var(--pkb-card);
          border-color: var(--pkb-border);
          box-shadow: var(--pkb-shadow);
          transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .pkb-app .pkb-plan-card,
        .pkb-app .pkb-profile-picture-area {
          background: var(--pkb-surface-raised);
        }

        .pkb-app .pkb-plan-icon,
        .pkb-app .pkb-settings-heading-icon,
        .pkb-app .pkb-empty-icon {
          color: var(--pkb-primary);
          background: var(--pkb-soft);
        }

        .pkb-app .pkb-brand-icon {
          background: linear-gradient(135deg, var(--pkb-primary), var(--pkb-primary-deep));
        }

        .pkb-app .pkb-primary-button,
        .pkb-app .pkb-topbar-add {
          color: #ffffff;
          background: var(--pkb-primary-deep);
          border-color: transparent;
          transition: background-color 180ms ease, transform 180ms ease;
        }

        .pkb-app .pkb-primary-button:hover,
        .pkb-app .pkb-topbar-add:hover {
          background: var(--pkb-primary);
          transform: translateY(-1px);
        }

        .pkb-app .pkb-secondary-button {
          color: var(--pkb-text);
          background: var(--pkb-card);
          border-color: var(--pkb-border);
        }

        .pkb-app .pkb-secondary-button:hover {
          background: var(--pkb-soft);
          border-color: var(--pkb-primary);
        }

        .pkb-app .pkb-search,
        .pkb-app .pkb-form-input {
          color: var(--pkb-text);
          background: var(--pkb-control-bg);
          border-color: var(--pkb-border);
        }

        .pkb-app .pkb-search input {
          color: var(--pkb-text);
          background: transparent;
        }

        .pkb-app .pkb-search input::placeholder,
        .pkb-app .pkb-form-input::placeholder {
          color: var(--pkb-muted);
        }

        .pkb-app .pkb-search:focus-within,
        .pkb-app .pkb-form-input:focus {
          border-color: var(--pkb-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pkb-primary) 15%, transparent);
          outline: none;
        }

        .pkb-app .pkb-settings-toggle-row {
          border-color: var(--pkb-border);
        }

        .pkb-app .pkb-profile-picture-large {
          color: var(--pkb-primary);
          background: var(--pkb-soft);
          border-color: var(--pkb-border);
        }

        .pkb-app .pkb-footer {
          background: var(--pkb-sidebar-bg);
          border-color: var(--pkb-border);
        }

        .pkb-app .pkb-note-card:hover,
        .pkb-app .pkb-bookmark-card:hover,
        .pkb-app .pkb-tag-card:hover,
        .pkb-app .pkb-stat-card:hover {
          border-color: color-mix(in srgb, var(--pkb-primary) 40%, var(--pkb-border));
          box-shadow: 0 15px 34px color-mix(in srgb, var(--pkb-text) 7%, transparent);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}