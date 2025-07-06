import { useState } from 'react';
import Layout from '../components/Layout';
import { Trophy, Calendar, Gift, Zap, Users, Music, Sparkles, Info, ChevronRight, Star, Dice3, Award, Clock, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';

export default function AboutChallengers() {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Enhanced Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between mb-8">
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="relative">
                    <Trophy className="w-12 h-12 text-primary-600 icon-adaptive-shadow" />
                    <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 icon-adaptive-shadow" />
                  </div>
                  
                  <h1 
                    className="text-5xl font-bold text-neutral-800 text-white/90 text-adaptive-shadow"
                    data-text="osu!Challengers"
                  >
                    osu!Challengers
                  </h1>
                  
                  <div className="relative">
                    <BarChart3 className="w-12 h-12 text-purple-600 icon-adaptive-shadow" />
                    <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 icon-adaptive-shadow" />
                  </div>
                </div>
                
                <p className="text-xl text-neutral-600 max-w-4xl mx-auto text-white/75 text-adaptive-shadow leading-relaxed">
                  Welcome to osu!Challengers - a collection of competitive events where you can test your skills, win supporter, and have fun with the community!
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Event Types Overview */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-blue-500 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 text-white/90 text-adaptive-shadow">
                Event Types
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Weekly Card */}
              <div 
                className={`relative overflow-hidden glass-card-enhanced rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'weekly' ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
                onClick={() => setActiveTab('weekly')}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800">o!C Weekly</h3>
                </div>
                <p className="text-neutral-700 mb-6 leading-relaxed">
                  Standard weekly challenges with single maps. Difficulty increases throughout the month.
                </p>
                <div className="flex items-center gap-3 text-blue-700 font-semibold glass-card rounded-xl p-3">
                  <Award className="w-5 h-5" />
                  <span>2 Supporter Prizes</span>
                </div>
                {activeTab === 'weekly' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-2xl pointer-events-none"></div>
                )}
              </div>

              {/* CE Card */}
              <div 
                className={`relative overflow-hidden glass-card-enhanced rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'ce' ? 'ring-4 ring-purple-400 ring-opacity-50' : ''}`}
                onClick={() => setActiveTab('ce')}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800">o!C CE</h3>
                </div>
                <p className="text-neutral-700 mb-6 leading-relaxed">
                  Cycle End events featuring all maps from the current season. Top 3 + raffle system for extra chances!
                </p>
                <div className="flex items-center gap-3 text-purple-700 font-semibold glass-card rounded-xl p-3">
                  <Award className="w-5 h-5" />
                  <span>6 Supporter Prizes</span>
                </div>
                {activeTab === 'ce' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-2xl pointer-events-none"></div>
                )}
              </div>

              {/* Custom Card */}
              <div 
                className={`relative overflow-hidden glass-card-enhanced rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${activeTab === 'custom' ? 'ring-4 ring-green-400 ring-opacity-50' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Gift className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800">o!C Custom</h3>
                </div>
                <p className="text-neutral-700 mb-6 leading-relaxed">
                  Special events with custom maps and songs created just for you!
                </p>
                <div className="flex items-center gap-3 text-green-700 font-semibold glass-card rounded-xl p-3">
                  <Award className="w-5 h-5" />
                  <span>6 Months + Merch</span>
                </div>
                <span className="absolute top-4 right-4 px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg">
                  Coming Soon!
                </span>
                {activeTab === 'custom' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-2xl pointer-events-none"></div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Information Tabs */}
          <div className="glass-card-enhanced rounded-3xl shadow-xl border border-neutral-200 overflow-hidden">
            {/* Tab Content */}
            <div className="p-10">
              {activeTab === 'weekly' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-800">o!C Weekly Details</h3>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <div className="glass-card rounded-xl p-6 mb-8">
                      <p className="text-neutral-700 text-lg leading-relaxed m-0">
                        Every week, a new Playlist is created in Lazer containing exactly <strong className="text-blue-700">1 map</strong>. The difficulty progression throughout the month is carefully designed to challenge players of all skill levels.
                      </p>
                    </div>
                    
                    <div className="my-8">
                      <h4 className="text-xl font-semibold text-blue-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6" />
                        Difficulty Progression
                      </h4>
                      <div className="glass-card-enhanced rounded-2xl p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center glass-card rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-700 mb-2">Week 1</div>
                            <div className="text-sm text-blue-600 font-medium">5.5★ - 5.9★</div>
                          </div>
                          <div className="text-center glass-card rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-700 mb-2">Week 2</div>
                            <div className="text-sm text-blue-600 font-medium">6.0★ - 6.4★</div>
                          </div>
                          <div className="text-center glass-card rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-700 mb-2">Week 3</div>
                            <div className="text-sm text-blue-600 font-medium">6.5★ - 6.9★</div>
                          </div>
                          <div className="text-center glass-card rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-700 mb-2">Week 4</div>
                            <div className="text-sm text-blue-600 font-medium">7.0★ - 7.4★</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-xl font-semibold text-neutral-800 mt-8 mb-6 flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                      How to Win Supporter
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="glass-card-enhanced rounded-2xl p-8 hover:shadow-xl transform hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                            <Trophy className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <h5 className="text-lg font-semibold text-gray-800 mb-2">Highest Score</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">Win the Playlist by achieving the highest overall score across all difficulties</p>
                      </div>
                      <div className="glass-card-enhanced rounded-2xl p-8 hover:shadow-xl transform hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <h5 className="text-lg font-semibold text-gray-800 mb-2">Mod Challenge</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">Get the best score with the specific mod chosen for that week</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ce' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-800">o!C CE (Cycle End) Details</h3>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <div className="glass-card rounded-xl p-6 mb-8">
                      <p className="text-neutral-700 text-lg leading-relaxed m-0">
                        Three days before the end of each month, a special collage is created containing <strong className="text-purple-700">all Weekly maps</strong> from the current season. This creates massive multi-map challenges that test your consistency across all difficulty levels!
                      </p>
                    </div>
                    
                    <div className="glass-card-enhanced rounded-2xl p-8 my-8">
                      <h4 className="text-xl font-semibold text-purple-900 mb-6 flex items-center gap-2">
                        <Award className="w-6 h-6" />
                        Prize Distribution
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 glass-card rounded-xl p-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">1</div>
                          <span className="text-purple-800 font-semibold text-lg">Top 3 on leaderboard: 1 month Supporter each</span>
                        </div>
                        <div className="flex items-center gap-4 glass-card rounded-xl p-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">2</div>
                          <span className="text-purple-800 font-semibold text-lg">Raffle winners (3 people): 1 month Supporter each</span>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-xl font-semibold text-neutral-800 mt-8 mb-6 flex items-center gap-2">
                      <Dice3 className="w-6 h-6 text-indigo-600" />
                      Raffle System
                    </h4>
                    <div className="glass-card-enhanced rounded-2xl p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                          <Dice3 className="w-6 h-6 text-white" />
                        </div>
                        <h5 className="font-bold text-indigo-800 text-lg">How it Works</h5>
                      </div>
                      <ul className="space-y-4 text-indigo-700">
                        <li className="flex items-start gap-3 glass-card rounded-lg p-3">
                          <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" />
                          <span className="font-medium">Each top score on a map = 1 raffle entry</span>
                        </li>
                        <li className="flex items-start gap-3 glass-card rounded-lg p-3">
                          <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" />
                          <span className="font-medium">Maximum entries = number of maps in the Playlist</span>
                        </li>
                        <li className="flex items-start gap-3 glass-card rounded-lg p-3">
                          <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" />
                          <span className="font-medium">3 winners drawn, all entries for a winner removed after selection</span>
                        </li>
                        <li className="flex items-start gap-3 glass-card rounded-lg p-3">
                          <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" />
                          <span className="font-medium">More top scores = better odds, but still 1 month prize</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-800">o!C Custom Details</h3>
                  </div>
                  
                  <div className="prose prose-lg max-w-none">
                    <div className="glass-card-enhanced rounded-2xl p-8 mb-8 hover:shadow-xl transform hover:scale-105 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Something Special!</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Custom events feature <strong>custom commissioned maps</strong> with <strong>brand new songs</strong> created exclusively for osu!Challengers participants! This is a completely unique experience you won't find anywhere else.
                      </p>
                    </div>

                    <h4 className="text-xl font-semibold text-neutral-800 mt-8 mb-6 flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                      Prize Pool
                    </h4>
                    <div className="glass-card-enhanced rounded-2xl p-8 hover:shadow-xl transform hover:scale-105 transition-all">
                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl">
                            <Trophy className="w-10 h-10 text-white" />
                          </div>
                          <div>
                            <h5 className="font-bold text-orange-800 text-xl mb-2">6 Months of osu!supporter</h5>
                            <p className="text-orange-700 text-lg">Plus your choice of official osu! merchandise!</p>
                          </div>
                        </div>
                        <div className="glass-card rounded-lg p-4 text-sm text-orange-800 border border-orange-200">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            <span className="font-medium">Merchandise must be in stock on the official osu! store</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center">
                      <span className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-bold rounded-2xl border border-green-300 shadow-lg text-lg">
                        <Clock className="w-6 h-6" />
                        Currently in Production - Stay Tuned!
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rules Section */}
          <div className="mt-12 glass-card-enhanced bg-gradient-to-r from-purple-100/50 to-pink-100/50 rounded-2xl p-8 backdrop-blur-lg border border-purple-200/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h2 
                className="text-2xl font-bold text-gray-900"
                data-text="Important Guidelines"
              >
                Important Guidelines
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 backdrop-blur-md border border-amber-100/60">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  Mod Challenges
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>Unless specified in the Playlist description, mod challenges must use default settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>You can add other mods, even ones that change the main mod's difficulty</span>
                  </li>
                </ul>
              </div>
              
              <div className="glass-card rounded-xl p-6 backdrop-blur-md border border-blue-100/60">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  Score Visibility
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Your winning score must be publicly visible on the official Playlist leaderboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Screenshots of non-visible plays won't count</span>
                  </li>
                </ul>
              </div>

              <div className="glass-card rounded-xl p-6 backdrop-blur-md border border-green-100/60 md:col-span-2">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Fair Play & Sportsmanship
                </h4>
                <p className="text-sm text-gray-700">
                  Respect all participants and their achievements. Everyone is trying their best, and that deserves recognition. Keep the competition friendly and fun!
                </p>
              </div>
            </div>

            <div className="mt-6 glass-card rounded-lg p-4 border-2 border-amber-300 shadow-md bg-gradient-to-r from-amber-100 to-yellow-100">
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
            <div className="inline-flex flex-col items-center gap-6 px-10 py-8 glass-card-enhanced rounded-3xl border-2 border-primary-200 shadow-2xl">
              <div className="flex items-center gap-4">
                <Sparkles className="w-8 h-8 text-primary-600" />
                <h3 className="text-2xl font-bold text-neutral-800">Ready to Compete?</h3>
                <Sparkles className="w-8 h-8 text-primary-600" />
              </div>
              <p className="text-lg text-neutral-700 max-w-2xl leading-relaxed">
                Jump into the current challenge and show what you've got! Every map is an opportunity to prove your skills and win amazing prizes.
              </p>
              <div className="flex items-center gap-3 text-primary-600 text-lg font-bold">
                <Star className="w-6 h-6" />
                <span>Good luck and have fun!</span>
                <Star className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}