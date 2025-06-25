import { useState } from 'react';
import Layout from '../components/Layout';
import { Trophy, Calendar, Gift, Zap, Users, Music, Sparkles, Info, ChevronRight, Star, Dice3, Award, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AboutChallengers() {
  const [activeTab, setActiveTab] = useState('weekly');

  const formatStyles = {
    weekly: 'from-blue-50 to-blue-100 border-blue-200',
    ce: 'from-purple-50 to-purple-100 border-purple-200',
    custom: 'from-green-50 to-green-100 border-green-200'
  };

  const iconStyles = {
    weekly: 'text-blue-600 bg-blue-100',
    ce: 'text-purple-600 bg-purple-100',
    custom: 'text-green-600 bg-green-100'
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Trophy className="w-10 h-10 text-primary-600" />
            <h1 className="text-5xl font-bold text-neutral-800">osu!Challengers</h1>
            <Sparkles className="w-10 h-10 text-yellow-500" />
          </div>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            Welcome to osu!Challengers - a collection of competitive events where you can test your skills, win supporter, and have fun!
          </p>
        </div>

        {/* Event Types Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary-600" />
            Event Types
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Weekly Card */}
            <div 
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${formatStyles.weekly} border-2 border-blue-300 p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'weekly' ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${iconStyles.weekly} flex items-center justify-center`}>
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-800">o!C Weekly</h3>
              </div>
              <p className="text-neutral-700 mb-4">
                Standard weekly challenges with single maps. Difficulty increases throughout the month.
              </p>
              <div className="flex items-center gap-2 text-blue-700 font-semibold">
                <Award className="w-5 h-5" />
                <span>2 Supporter Prizes</span>
              </div>
            </div>

            {/* CE Card */}
            <div 
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${formatStyles.ce} border-2 border-purple-300 p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'ce' ? 'ring-4 ring-purple-400 ring-opacity-50' : ''}`}
              onClick={() => setActiveTab('ce')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${iconStyles.ce} flex items-center justify-center`}>
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-800">o!C CE</h3>
              </div>
              <p className="text-neutral-700 mb-4">
                Cycle End events featuring all maps from the current season. Top 3 + raffle system for extra chances!
              </p>
              <div className="flex items-center gap-2 text-purple-700 font-semibold">
                <Award className="w-5 h-5" />
                <span>6 Supporter Prizes</span>
              </div>
            </div>

            {/* Custom Card */}
            <div 
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${formatStyles.custom} border-2 border-green-300 p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'custom' ? 'ring-4 ring-green-400 ring-opacity-50' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${iconStyles.custom} flex items-center justify-center`}>
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-800">o!C Custom</h3>
              </div>
              <p className="text-neutral-700 mb-4">
                Special events with custom maps and songs created just for you!
              </p>
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <Award className="w-5 h-5" />
                <span>6 Months + Merch</span>
              </div>
              <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
                Coming Soon!
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden">
          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'weekly' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  o!C Weekly Details
                </h3>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-neutral-700">
                    Every week, a new Playlist is created in Lazer containing exactly <strong>1 map</strong>. The difficulty progression throughout the month is:
                  </p>
                  
                  <div className="my-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">Difficulty Progression</h4>
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">Week 1</div>
                            <div className="text-sm text-blue-600">5.5★ - 5.9★</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">Week 2</div>
                            <div className="text-sm text-blue-600">6.0★ - 6.4★</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">Week 3</div>
                            <div className="text-sm text-blue-600">6.5★ - 6.9★</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">Week 4</div>
                            <div className="text-sm text-blue-600">7.0★ - 7.4★</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">How to Win Supporter</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Trophy className="w-6 h-6 text-green-600" />
                        <h5 className="font-semibold text-green-800">Highest Score</h5>
                      </div>
                      <p className="text-green-700">Win the Playlist by achieving the highest overall score</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-6 h-6 text-purple-600" />
                        <h5 className="font-semibold text-purple-800">Mod Challenge</h5>
                      </div>
                      <p className="text-purple-700">Get the best score with the specific mod chosen for that week</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ce' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  o!C CE (Cycle End) Details
                </h3>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-neutral-700">
                    Three days before the end of each season, a special collage is created containing <strong>all maps from that season</strong>. This creates massive multi-map challenges!
                  </p>
                  
                  <div className="bg-purple-50 rounded-xl p-6 my-6">
                    <h4 className="text-lg font-semibold text-purple-900 mb-4">Prize Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                        <span className="text-purple-800 font-medium">Top 3 on leaderboard: 1 month Supporter each</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                        <span className="text-purple-800 font-medium">Raffle winners (3 people): 1 month Supporter each</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">Raffle System</h4>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Dice3 className="w-6 h-6 text-indigo-600" />
                      <h5 className="font-semibold text-indigo-800">How it Works</h5>
                    </div>
                    <ul className="space-y-2 text-indigo-700">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span>Each top score on a map = 1 raffle entry</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span>Maximum entries = number of maps in the Playlist</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span>3 winners drawn, all entries for a winner removed after selection</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span>More top scores = better odds, but still 1 month prize</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                  <Gift className="w-6 h-6 text-green-600" />
                  o!C Custom Details
                </h3>
                
                <div className="prose prose-lg max-w-none">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-8 h-8 text-green-600" />
                      <h4 className="text-xl font-semibold text-green-800 m-0">Something Special!</h4>
                    </div>
                    <p className="text-green-700 m-0">
                      Custom events feature <strong>custom commissioned maps</strong> with <strong>brand new songs</strong> created exclusively for osu!Challengers participants!
                    </p>
                  </div>

                  <h4 className="text-xl font-semibold text-neutral-800 mt-6 mb-3">Prize Pool</h4>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-300">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h5 className="font-bold text-orange-800 text-lg">6 Months of osu!supporter</h5>
                          <p className="text-orange-700">Plus your choice of official osu! merchandise!</p>
                        </div>
                      </div>
                      <div className="bg-orange-100 rounded-lg p-3 text-sm text-orange-800">
                        <Info className="w-4 h-4 inline mr-2" />
                        Merchandise must be in stock on the official osu! store
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-semibold rounded-full border border-green-300">
                      <Clock className="w-5 h-5" />
                      Currently in Production - Stay Tuned!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rules Section */}
        <div className="mt-12 bg-white rounded-3xl p-8 border-2 border-amber-200 shadow-lg">
          <h2 className="text-3xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
            <Info className="w-8 h-8 text-amber-600" />
            Important Guidelines
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Mod Challenges
              </h3>
              <p className="text-neutral-700">
                Unless specified in the Playlist description, mod challenges must use default settings. You can add other mods, even ones that change the main mod's difficulty!
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Score Visibility
              </h3>
              <p className="text-neutral-700">
                Your winning score must be publicly visible on the official Playlist leaderboard. Screenshots of non-visible plays won't count.
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Fair Play & Sportsmanship
              </h3>
              <p className="text-neutral-700">
                Respect all participants and their achievements. Everyone is trying their best, and that deserves recognition. Keep the competition friendly and fun!
              </p>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border-2 border-amber-300 shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-neutral-800 text-sm font-medium">
                <strong className="text-amber-700">Note:</strong> Violation of these guidelines may result in exclusion from future events. Guidelines may be updated to ensure a positive experience for all participants.
              </p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-gradient-to-r from-primary-100 to-purple-100 rounded-3xl border-2 border-primary-200">
            <h3 className="text-xl font-bold text-neutral-800">Ready to Compete?</h3>
            <p className="text-lg text-neutral-700">
              Jump into the current challenge and show what you've got!
            </p>
            <div className="flex items-center gap-2 text-primary-600">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">Good luck and have fun!</span>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}