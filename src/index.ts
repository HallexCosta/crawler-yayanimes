import puppeteer, { Browser, errors, Page } from 'puppeteer'

import * as config from './config/puppeteer'

import { getCurrentDate, getCurrentTime } from './common/utils/date'
import { EmptyFile, saveFile } from './common/utils/file'
import { toUpperFirstCase } from "./common/utils/text"

import animesJSON from './__generated__/database.json'
 
type Episodie = {
  title: string
  thumbnail: string
  quality_streaming: string
  provisory_url_route: string
}

type Ova = {
  title: string
  thumbnail: string
  quality_streaming: string
  provisory_url_route: string
}

type StreamingVideoURL = {
  episodies: string[],
  ovas: string[]
}

type StreamingURL = {
  url: string
}

type Anime = Omit<AnimeTextData, 'streamings'> & {
  streamings: {
    episodies: (Omit<Episodie, 'provisory_url_route'> & StreamingURL)[],
    ovas: (Omit<Ova, 'provisory_url_route'> & StreamingURL)[]
  }
}

type AnimeTextData = {
  name: string
  image_url: string
  genre: string
  status: string
  studio: string
  sinopse: string
  release_data: number
  rating: number
  streamings: Streaming
}

type Streaming = {
  episodies: Episodie[],
  ovas: Ova[]
}

type PageErrors = {
  error: boolean
}

type PackageLevelScope = {
  log: string
}

const PackageLevelScope: PackageLevelScope = {
  log: ''
}

async function gettingAnimeTextData(browser: Browser, anime: { goto_url: string }): Promise<AnimeTextData|undefined> {
  const page = await browser.newPage()

  await page.goto(anime.goto_url, {
    timeout: 0,
    waitUntil: 'networkidle2'
  })

  const animeTextData = await page.evaluate(() => {
    const verifyFoundAnime = () => {
      const pageNotFound = document.querySelector<HTMLHeadingElement>('h3')
        ?.innerText

      const episodes = [
        ...document.querySelectorAll('.contentBox ul li > div.box-episodio3')
      ]

      const errors: PageErrors = {
        error: false
      }

      // Page not found
      if (pageNotFound === 'PAGINA NÃO ENCONTRADA') {
        console.log(`Error Message: ${pageNotFound}`)

        errors.error = true
      }

      // Episdodes found
      if (episodes.length <= 0) {
        console.log('Without Episodes: ', episodes.length)

        errors.error = true
      }

      return errors.error
    }
    const separateOvaOfEpisodie = (allEpisodes: Element[]) => {
      const episodes: Episodie[] = []
      const ovas: Ova[] = []

      allEpisodes.forEach(episodeOrOva => {
        const title = episodeOrOva.children[0].children[0].innerHTML.trim()
        const thumbnail = episodeOrOva.children[0].children[1].children[0]
          .attributes[0].nodeValue as string

        const qualityStreaming = episodeOrOva.children[0].children[1]
          .children[1].textContent as string

        const url = (episodeOrOva.children[1].children[0]
          .children[1] as HTMLAnchorElement).pathname

        if (title.match(/(ova)/gi)) {
          ovas.push({
            title,
            thumbnail,
            quality_streaming,
            url
          })
        } else {
          episodes.push({
            title,
            thumbnail,
            quality_streaming,
            url
          })
        }
      })

      return { episodes, ovas }
    }

    const error = verifyFoundAnime()

    if (error) {
      return
    }

    const title = document.querySelector<HTMLSpanElement>('span.color-change')
    const image = document.querySelector<HTMLImageElement>('#capaAnime > img')
    const about = document.querySelectorAll<HTMLTableRowElement>(
      'table > tbody > tr > td'
    )
    const sinopse = document.querySelectorAll<HTMLDivElement>('.single div')
    const rating = document.querySelector<HTMLSpanElement>('#rmp-rating')
    const allEpisodes = [
      ...document.querySelectorAll('.contentBox ul li > div.box-episodio3')
    ]

    const streamings = separateOvaOfEpisodie(allEpisodes)

    const animeTextData: AnimeTextData = {
      name: title ? title.innerText.trim() : 'Without name',
      imageURL: image ? image.src.trim() : 'Without image',
      studio: about[1] ? about[1].innerText.trim() : 'Without studio',
      genre: about[3] ? about[3].innerText.trim() : 'Without genre',
      status: about[5] ? about[5].innerText.trim() : 'Without reelase data',
      releaseData: about[7] ? Number(about[7].innerText.trim()) : 0,
      rating: rating ? Number(rating.innerText.trim()) : 0,
      sinopse: sinopse ? sinopse[13].innerText.trim() : 'Without sinopse',
      streamings: {
        episodes: streamings.episodes ? streamings.episodes.reverse() : [],
        ovas: streamings.ovas ? streamings.ovas.reverse() : []
      }
    }

    return animeTextData
  })

  await page.close()

  return animeTextData
}

async function gettingStreamingsVideoURL(browser: Browser, anime: { name: string, data: AnimeTextData }): Promise<StreamingVideoURL|undefined> {
  const streamings: StreamingVideoURL = {
    episodies: [],
    ovas: []
  }

  let episodeCount = 0
  for await (const episode of anime.data.streamings.episodies) {
    const page = await browser.newPage()

    console.log(`> Episode - ${episodeCount+1}`)

    await page.goto(`${config.base_url}${episode.provisory_url_route}`, {
      timeout: 30000,
      waitUntil: 'networkidle2'
    }) 

    // Getting Animes with Streamings URL
    const streaming: string|undefined = await page.evaluate(async function() {
      const video = document.querySelector('video') as HTMLVideoElement

      const verifyEpisodesExists = () => {
        const errors: PageErrors = {
          episodesNotFound: false,
          pageNotFound: false
        }

        if (video) {
          errors.episodesNotFound = true
        }

        return errors
      }

      const { episodesNotFound }: PageErrors = verifyEpisodesExists()

      if (episodesNotFound) return

      const streamingURL = video.src

      return streamingURL
    })

    if (!streaming) break; 

    streamings.episodies.push(streaming)

    await page.close()

    episodeCount++
  }

  let ovaCount = 0
  for await (const ova of anime.data.streamings.ovas) {
    const page = await browser.newPage()
    
    console.log(`> Ova - ${ovaCount+1}`)

    await page.goto(`${config.base_url}${ova.provisory_url_route}`, {
      timeout: 30000,
      waitUntil: 'networkidle2'
    })
    
    // Getting Animes with Streamings URL
    const streaming: string = await page.evaluate(async function() {
      const streamingURL = document.querySelector('video') as HTMLVideoElement
      const streaming = streamingURL.src
      return streaming
    })

    streamings.ovas.push(streaming)
    
    await page.close()

    ovaCount++
  }

  return streamings
}

async function gettingAnime(browser: Browser, animesNames: string[]): Promise<Anime[]> {
  const animes: Anime[] = []
  
  console.log('Amount animes in transition: ', animesNames.length)

  let index = 0
  for (const animeName of animesNames) {
    console.log()
    console.log(`> ${index+1}) ${animesNames[index]} - Starting`)

    // Getting Anime Text Data
    console.log('> Getting Text Data')
    const animeTextData: AnimeTextData | undefined = await gettingAnimeTextData(browser, {
      goto_url: `${config.base_url}/${animesNames[index]}`
    })

    if (!animeTextData) {
      break
    }

    // Getting Streamings URL
    console.log('> Getting Streamings URL')
    const streamings: StreamingVideoURL | undefined = await gettingStreamingsVideoURL(browser, {
      name: animesNames[index],
      data: animeTextData
    })    

    let anime: Anime = {} as Anime

    if (!streamings) {
      anime = {
        ...animeTextData,
        streamings: {
          episodies: [],
          ovas: []
        }
      }

      animes.push(anime)
    } else {
      anime = {
        ...animeTextData,
        streamings: {
          episodies: streamings.episodies.map((episodie_url, index) => {
            return {
              title: animeTextData.streamings.episodies[index].title,
              thumbnail: animeTextData.streamings.episodies[index].thumbnail,
              quality_streaming: animeTextData.streamings.episodies[index].quality_streaming,
              url: episodie_url
            }
          }),
          ovas: streamings.ovas.map((ova_url: string, index: number) => {
            return {
              title: animeTextData.streamings.ovas[index].title,
              thumbnail: animeTextData.streamings.ovas[index].thumbnail,
              quality_streaming: animeTextData.streamings.ovas[index].quality_streaming,
              url: ova_url
            }
          })
        }
      }
    }

    console.log(anime)

    const date = getCurrentDate(false, true)
    const time = getCurrentTime()

    const animeName = toUpperFirstCase(animesNames[index])

    console.log('')

    if (anime) {
      console.log(`[${date} ${time}] INFO  :...Anime ${animeName} - Getting Successfully`)
      PackageLevelScope.log += `[${date} ${time}] INFO  :...Anime ${animeName} - Getting Successfully\n`

      animes.push(anime)
    } else {
      PackageLevelScope.log += `[${date} ${time}] INFO  :...Anime ${animeName} - Episodies Not Found or Not Added\n`
      console.log(`[${date} ${time}] INFO  :...Anime ${animeName} - Episodies Not Found or Not Added`)
    }

    index++
  }

  return animes
}

function normalize(animesNames: (string|undefined)[]): string[] {
  const animesNormalize = animesNames.map(animeName => {
    if (animeName) {
      return animeName.trim().toLowerCase()
    }
  })

  return animesNormalize as string[]
}

async function gettingAnimesRouteParam(browser: Browser): Promise<string[]> {
  const page = await browser.newPage()

  await page.goto(`${config.base_url}/lista-de-animes`, {
    timeout: 0,
    waitUntil: 'networkidle2'
  })

  const animesRouteParam = await page.evaluate(function() {
    const animesNamesAnchor: HTMLAnchorElement[] = [
      ...document
        .querySelectorAll<HTMLAnchorElement>('.aba ul > li > a')
    ]

    const animesURL = animesNamesAnchor.map(animeName => animeName.href)
    const animesParams = animesURL.map(animeURL => animeURL.split('/')[3])

    return animesParams
  })

  await page.close()

  return animesRouteParam
}

function shiftArray(array: string[], slice: number): string[] {
  let newArray: string[] = []

  for (let i = 0; i < array.length; i++) {
    if (i >= slice) {
      newArray.push(array[i])
    }
  }

  return newArray
}

(async function () {
  try { 
    const browser = await puppeteer.launch(config.launch)

    //Getting Animes Routes
    console.log()
    console.log('> Getting Animes Routes')
    const animesRouteParam = await gettingAnimesRouteParam(browser)
    console.log(animesRouteParam)
    // Getting Animes Data
    console.log('> Getting Animes Data')
    // const animes: Anime[] = await gettingAnime(browser, normalize(['charlotte']))

    const animes: Anime[] = await gettingAnime(browser, normalize(animesRouteParam))
    console.log()
    // console.log('Animes', animes)
    console.log('Amount animes getting: ', animes.length)
    console.log() 
    

    const databaseSaveConfig: EmptyFile = {
      filename: 'database',
      extension: 'json',
      directorySave: '../../__generated__',
      dataContent: animes,
      isJSON: true
    }

    const savedDatabaseFile = saveFile(databaseSaveConfig)
    
    if (savedDatabaseFile) {
      console.log(`> File ${databaseSaveConfig.filename}.${databaseSaveConfig.extension} was created successfully on directory ${databaseSaveConfig.directorySave}`)
    }

    const logSaveConfig: EmptyFile = {
      filename: 'console',
      extension: 'log',
      directorySave: '../../__generated__',
      dataContent: PackageLevelScope.log,
      isJSON: false
    }

    const savedLogFile = saveFile(logSaveConfig)
    
    if (savedLogFile) {
      console.log(`> File ${logSaveConfig.filename}.${logSaveConfig.extension} was created successfully on directory ${logSaveConfig.directorySave}`)
    }
    
    console.log()
    console.log(`LOGS:\n${PackageLevelScope.log}`)

    console.log()

    await browser.close()

    console.log(`Amount Animes: ${animesRouteParam.length}`)
    console.log('> Finish Crawler Script!')

  } catch(e) {
    console.log(e)
  } 
})()

console.log('> Running App')