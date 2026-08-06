import { useState } from 'react'
import { Loader2, Play, Bookmark, BookmarkCheck, Download, Star, Pencil } from 'lucide-react'
import { useMangaDetail } from '../hooks/useMangaDetail'
import { MangaHeroHeader } from '../components/manga/MangaHeroHeader'
import { MangaRatingNotes } from '../components/manga/MangaRatingNotes'
import { MangaChaptersSection } from '../components/manga/MangaChaptersSection'
import { MangaModals } from '../components/manga/MangaModals'
import { buildSmartReadUrl } from '../lib/smartUrl'
import { cn } from '../lib/utils'
import api from '../lib/api'

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
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
  const genreText = manga.genres.slice(0, 3).join(', ') || 'Manga'

  return (
    <div 
      className="min-h-full pb-20 transition-colors duration-1000"
      style={{ '--theme-color': themeColor } as React.CSSProperties}
    >
      {/* 1. Backdrop Banner */}
      <MangaHeroHeader
        manga={manga}
        themeColor={themeColor}
        showQueueLink={showQueueLink}
        onBack={() => navigate(-1)}
        onQueueClick={() => navigate('/downloads')}
      />

      {/* 2. Header Row: Cover Overlap + Title + Tag Pills + Action Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end -mt-24 md:-mt-28 mb-8">
          {/* Cover Card */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div 
              className="w-36 sm:w-44 md:w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl transition-transform hover:scale-[1.02]"
              style={{ boxShadow: `0 20px 40px -12px ${themeColor}66` }}
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
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600 font-bold">
                  No Cover
                </div>
              )}
            </div>
          </div>

          {/* Series Header Meta */}
          <div className="flex-1 min-w-0 w-full text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <h1 
                className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none text-white truncate"
                style={{ fontFamily: "'Anton', sans-serif" }}
              >
                {manga.title}
              </h1>
              <button onClick={openMetaEdit} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0" title="Edit Metadata">
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 mb-3 font-semibold">
              {authorText} · {genreText}
            </p>

            {/* Tag Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-5">
              {manga.genres.map((tag) => (
                <span 
                  key={tag} 
                  className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] font-extrabold text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {resumeTarget ? (
                <button
                  onClick={() => {
                    const ch = resumeTarget.chapter
                    const targetUrl = buildSmartReadUrl(provider || '', manga.id, ch.id, manga.title, ch.title)
                    navigate(targetUrl)
                  }}
                  className="btn-primary px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-all"
                  style={{ boxShadow: '0 10px 24px -8px rgba(220,38,38,.5)' }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {resumeTarget.label}
                </button>
              ) : manga.chapters[0] ? (
                <button
                  onClick={() => {
                    const ch = manga.chapters[manga.chapters.length - 1]
                    const targetUrl = buildSmartReadUrl(provider || '', manga.id, ch.id, manga.title, ch.title)
                    navigate(targetUrl)
                  }}
                  className="btn-primary px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-all"
                  style={{ boxShadow: '0 10px 24px -8px rgba(220,38,38,.5)' }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Reading
                </button>
              ) : null}

              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className={cn(
                  "px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 transition-all border shadow-lg cursor-pointer",
                  subscribed
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
                    : "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                )}
              >
                {subscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : subscribed ? (
                  <BookmarkCheck className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                ) : (
                  <Bookmark className="w-4 h-4 text-white" />
                )}
                {subscribed ? 'In Library' : 'Add to Library'}
              </button>

              {isAdmin && (
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkLoading}
                  className="btn-secondary px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"
                >
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Main Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 md:gap-12 items-start">
          {/* Left Column: Synopsis, 4-Card Stats, Chapters */}
          <div className="min-w-0">
            {/* Synopsis */}
            {manga.description && (
              <p className="text-sm leading-relaxed text-zinc-300 max-w-3xl mb-8 whitespace-pre-line">
                {manga.description}
              </p>
            )}

            {/* 4-Card Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1">Status</div>
                <div className="text-base font-black capitalize text-zinc-100">{manga.status || 'Ongoing'}</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1">Chapters</div>
                <div className="text-base font-black text-zinc-100">{manga.chapters.length}</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1">Rating</div>
                <div className="text-base font-black text-amber-400 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {userRating > 0 ? `${userRating}.0` : '9.1'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1">Source</div>
                <div className="text-base font-black capitalize text-zinc-100">{manga.provider}</div>
              </div>
            </div>

            {/* Chapters Section */}
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

          {/* Right Aside Column: Personal Rating & Notes */}
          <aside className="sticky top-6">
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
        </div>
      </div>

      {/* Modals */}
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
