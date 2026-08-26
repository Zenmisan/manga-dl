/* Hallmark · genre: atmospheric · macrostructure: sidebar-detail (comix.to model) · theme: app tokens · nav: sticky-header */
import { useState } from 'react'
import { Play, Bookmark, BookmarkCheck, Download, Star, Pencil } from 'lucide-react'
import { useMangaDetail } from '../hooks/useMangaDetail'
import { MangaHeroHeader } from '../components/manga/MangaHeroHeader'
import { MangaRatingNotes } from '../components/manga/MangaRatingNotes'
import { MangaChaptersSection } from '../components/manga/MangaChaptersSection'
import { MangaModals } from '../components/manga/MangaModals'
import { buildSmartReadUrl } from '../lib/smartUrl'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { ThemedLoadingScreen, ThemedSpinner } from '../components/common/ThemedLoader'

export default function MangaDetail() {
  const {
    provider, mangaId, navigate, manga, loading, downloading, showQueueLink,
    bulkLoading, isAdmin, subscribed, subscribing, handleSubscribe,
    handleDownload, handleBulkDownload, chapterSort, setChapterSort,
    chapterSearch, setChapterSearch, readFilter, setReadFilter,
    scanlatorFilter, setScanlatorFilter, bookmarks, toggleBookmark,
    readChapters, toggleReadStatus, handleMarkAllRead, malSyncing, handleMALSync,
    userNote, setUserNote, userRating, setUserRating, noteEditing, setNoteEditing,
    noteDraft, setNoteDraft, malToken, themeColor, swipedChapterId, setSwipedChapterId,
    swipeStartX, imgRef, notifEnabled, toggleNotif, editingMeta, setEditingMeta,
    metaDraft, setMetaDraft, openMetaEdit, saveMetaEdit, scanlators, displayedChapters, resumeTarget,
  } = useMangaDetail()

  const [imgError, setImgError] = useState(false)

  if (loading) {
    return (
      <ThemedLoadingScreen
        message="Loading Manga Details..."
        subMessage="Fetching metadata, chapters, and cover..."
      />
    )
  }

  if (!manga) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Manga not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 btn-secondary">Go Back</button>
      </div>
    )
  }

  const proxyUrl = manga.cover_url
    ? `${api.defaults.baseURL || ''}/manga/image-proxy?url=${encodeURIComponent(manga.cover_url)}&api_key=${localStorage.getItem('manga-api-key') || ''}`
    : ''

  const authorText = manga.authors.join(', ') || 'Unknown Author'
  const statusIsOngoing = manga.status?.toLowerCase().includes('ongoing') ?? true

  const goRead = (chId: string, chTitle: string) =>
    navigate(buildSmartReadUrl(provider || '', manga.id, chId, manga.title, chTitle))

  return (
    <div
      className="min-h-full pb-20 transition-colors duration-1000"
      style={{ '--theme-color': themeColor } as React.CSSProperties}
    >
      <MangaHeroHeader
        manga={manga}
        themeColor={themeColor}
        showQueueLink={showQueueLink}
        onBack={() => navigate(-1)}
        onQueueClick={() => navigate('/downloads')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="w-full lg:w-60 xl:w-64 shrink-0 -mt-20 lg:-mt-28">

            {/* Cover */}
            <div
              className="w-44 lg:w-full mx-auto lg:mx-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4 hover:scale-[1.01] transition-transform duration-300"
              style={{ boxShadow: `0 20px 40px -12px ${themeColor}55` }}
            >
              {proxyUrl && !imgError ? (
                <img
                  ref={imgRef}
                  src={proxyUrl}
                  alt={manga.title}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 font-bold text-xs">
                  No Cover
                </div>
              )}
            </div>

            {/* 3-Stat Bar */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              <div className="flex flex-col items-center py-2.5 px-1 rounded-xl bg-white/5 border border-white/10">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 mb-1" />
                <span className="text-xs font-black text-white leading-none mb-0.5">
                  {userRating > 0 ? `${userRating}.0` : '—'}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Rating</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-1 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-black text-white leading-none mb-0.5 mt-px">
                  {manga.chapters.length}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mt-[3px]">Chapters</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-1 rounded-xl bg-white/5 border border-white/10">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full mb-1 mt-1',
                    statusIsOngoing ? 'bg-emerald-400' : 'bg-zinc-500'
                  )}
                />
                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 text-center capitalize leading-tight">
                  {manga.status || 'Ongoing'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mb-6">
              {resumeTarget ? (
                <button
                  onClick={() => goRead(resumeTarget.chapter.id, resumeTarget.chapter.title)}
                  className="btn-primary w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {resumeTarget.label}
                </button>
              ) : manga.chapters[0] ? (
                <button
                  onClick={() => {
                    const ch = manga.chapters[manga.chapters.length - 1]
                    goRead(ch.id, ch.title)
                  }}
                  className="btn-primary w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Reading
                </button>
              ) : null}

              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className={cn(
                  'w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all border disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                  subscribed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                    : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                )}
              >
                {subscribing ? (
                  <ThemedSpinner size="sm" />
                ) : subscribed ? (
                  <BookmarkCheck className="w-4 h-4 fill-emerald-400" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                {subscribed ? 'In Library' : 'Add to Library'}
              </button>

              {isAdmin && (
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkLoading}
                  className="w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  {bulkLoading ? <ThemedSpinner size="sm" /> : <Download className="w-4 h-4" />}
                  Download All
                </button>
              )}
            </div>

            {/* Title + edit */}
            <div className="mb-5">
              <div className="flex items-start gap-2">
                <h1
                  className="flex-1 min-w-0 text-xl font-black uppercase tracking-tight text-white leading-tight"
                  style={{ fontFamily: "'Anton', sans-serif", overflowWrap: 'anywhere' }}
                >
                  {manga.title}
                </h1>
                <button
                  onClick={openMetaEdit}
                  aria-label="Edit metadata"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0 mt-1 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">{authorText}</p>
            </div>

            {/* GENRES */}
            {manga.genres.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent,#dc2626)] mb-2">
                  Genres
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map(g => (
                    <span
                      key={g}
                      className="px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-zinc-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DETAILS */}
            <div className="mb-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent,#dc2626)] mb-2">
                Details
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500 shrink-0">Source</span>
                  <span className="font-bold text-zinc-200 capitalize text-right">{manga.provider}</span>
                </div>
                {manga.authors.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500 shrink-0">Author</span>
                    <span className="font-bold text-zinc-200 text-right">{manga.authors.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SYNOPSIS */}
            {manga.description && (
              <div className="mb-5">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent,#dc2626)] mb-2">
                  Synopsis
                </div>
                <p className="text-xs leading-relaxed text-zinc-400 whitespace-pre-line">
                  {manga.description}
                </p>
              </div>
            )}

            {/* Personal Rating & Notes */}
            <MangaRatingNotes
              provider={provider}
              mangaId={mangaId}
              userRating={userRating}
              setUserRating={setUserRating}
              userNote={userNote}
              setUserNote={setUserNote}
              noteEditing={noteEditing}
              setNoteEditing={setNoteEditing}
              noteDraft={noteDraft}
              setNoteDraft={setNoteDraft}
            />
          </aside>

          {/* ── RIGHT: CHAPTERS ── */}
          <div className="flex-1 min-w-0 lg:pt-4">
            <MangaChaptersSection
              manga={manga}
              provider={provider}
              navigate={navigate}
              displayedChapters={displayedChapters}
              readChapters={readChapters}
              bookmarks={bookmarks}
              downloading={downloading}
              isAdmin={isAdmin}
              subscribed={subscribed}
              subscribing={subscribing}
              handleSubscribe={handleSubscribe}
              notifEnabled={notifEnabled}
              toggleNotif={toggleNotif}
              bulkLoading={bulkLoading}
              handleBulkDownload={handleBulkDownload}
              malToken={malToken}
              malSyncing={malSyncing}
              handleMALSync={handleMALSync}
              chapterSearch={chapterSearch}
              setChapterSearch={setChapterSearch}
              chapterSort={chapterSort}
              setChapterSort={setChapterSort}
              readFilter={readFilter}
              setReadFilter={setReadFilter}
              scanlators={scanlators}
              scanlatorFilter={scanlatorFilter}
              setScanlatorFilter={setScanlatorFilter}
              handleMarkAllRead={handleMarkAllRead}
              toggleBookmark={toggleBookmark}
              toggleReadStatus={toggleReadStatus}
              handleDownload={handleDownload}
              swipedChapterId={swipedChapterId}
              setSwipedChapterId={setSwipedChapterId}
              swipeStartX={swipeStartX}
            />
          </div>
        </div>
      </div>

      <MangaModals
        editingMeta={editingMeta}
        setEditingMeta={setEditingMeta}
        metaDraft={metaDraft}
        setMetaDraft={setMetaDraft}
        saveMetaEdit={saveMetaEdit}
      />
    </div>
  )
}
