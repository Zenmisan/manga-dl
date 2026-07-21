import { motion } from 'framer-motion'
import { Loader2, Play } from 'lucide-react'
import { useMangaDetail } from '../hooks/useMangaDetail'
import { MangaHeroHeader } from '../components/manga/MangaHeroHeader'
import { MangaInfoCard } from '../components/manga/MangaInfoCard'
import { MangaRatingNotes } from '../components/manga/MangaRatingNotes'
import { MangaTrackerLinks } from '../components/manga/MangaTrackerLinks'
import { MangaChaptersSection } from '../components/manga/MangaChaptersSection'
import { MangaModals } from '../components/manga/MangaModals'
import { buildSmartReadUrl } from '../lib/smartUrl'

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
    metaDraft, setMetaDraft, openMetaEdit, saveMetaEdit, trackerLinks, showTrackerModal,
    setShowTrackerModal, trackerSearch, setTrackerSearch, trackerResults, setTrackerResults, trackerSearching,
    searchTracker, showSyncModal, setShowSyncModal, syncStatus, setSyncStatus,
    syncScore, setSyncScore, syncProgress, setSyncProgress, syncStartDate, setSyncStartDate,
    syncEndDate, setSyncEndDate, syncing, openSyncModal, handleTrackerSync,
    removeTrackerLink, saveTrackerLink, scanlators, displayedChapters, resumeTarget,
  } = useMangaDetail()

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

  return (
    <div 
      className="min-h-full pb-20 transition-colors duration-1000"
      style={{ '--theme-color': themeColor } as React.CSSProperties}
    >
      {/* Hero Header */}
      <MangaHeroHeader
        manga={manga}
        themeColor={themeColor}
        showQueueLink={showQueueLink}
        onBack={() => navigate(-1)}
        onQueueClick={() => navigate('/downloads')}
      />

      {/* Main Details & Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-12 -mt-20 md:-mt-32 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column: Cover & Details */}
          <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto no-scrollbar">
            <div className="flex flex-col md:flex-row lg:flex-col gap-8 md:gap-12">
              <MangaInfoCard
                manga={manga}
                themeColor={themeColor}
                imgRef={imgRef}
                onOpenMetaEdit={openMetaEdit}
              />

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

              <MangaTrackerLinks
                trackerLinks={trackerLinks}
                openSyncModal={openSyncModal}
                removeTrackerLink={removeTrackerLink}
                onOpenTrackerModal={(t) => {
                  setShowTrackerModal(t)
                  setTrackerSearch(manga.title)
                  setTrackerResults([])
                  setTimeout(() => searchTracker(manga.title, t), 100)
                }}
              />
            </div>
          </div>

          {/* Right Column: Chapters */}
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

      {/* Floating Continue / Re-read Button */}
      {resumeTarget && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          onClick={() => {
            const ch = resumeTarget.chapter
            const targetUrl = buildSmartReadUrl(provider || '', manga!.id, ch.id, manga!.title, ch.title)
            navigate(targetUrl)
          }}
          className="fixed bottom-28 right-5 md:bottom-8 md:right-8 z-40 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/30 hover:-translate-y-0.5 transition-all"
          style={{ boxShadow: '0 8px 30px rgba(220,38,38,.4)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          {resumeTarget.label}
        </motion.button>
      )}

      {/* Modals */}
      <MangaModals
        showTrackerModal={showTrackerModal}
        setShowTrackerModal={setShowTrackerModal}
        trackerSearch={trackerSearch}
        setTrackerSearch={setTrackerSearch}
        trackerSearching={trackerSearching}
        trackerResults={trackerResults}
        searchTracker={searchTracker}
        saveTrackerLink={saveTrackerLink}
        showSyncModal={showSyncModal}
        setShowSyncModal={setShowSyncModal}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        syncScore={syncScore}
        setSyncScore={setSyncScore}
        syncProgress={syncProgress}
        setSyncProgress={setSyncProgress}
        syncStartDate={syncStartDate}
        setSyncStartDate={setSyncStartDate}
        syncEndDate={syncEndDate}
        setSyncEndDate={setSyncEndDate}
        syncing={syncing}
        handleTrackerSync={handleTrackerSync}
        editingMeta={editingMeta}
        setEditingMeta={setEditingMeta}
        metaDraft={metaDraft}
        setMetaDraft={setMetaDraft}
        saveMetaEdit={saveMetaEdit}
      />
    </div>
  )
}
