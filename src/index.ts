import puppeteer, { Browser, Page } from 'puppeteer'

import * as config from './config/puppeteer'
import { Utils } from './common/utils'

import { createServer, host, port } from './proxy'
 
type Episodie = {
  title: string
  thumbnail: string
  quality_streaming: string
}

type Ova = {
  title: string
  thumbnail: string
  quality_streaming: string
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
    episodies: (Episodie & StreamingURL)[],
    ovas: (Ova & StreamingURL)[]
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

type PackageLevelScope = {
  log: string
}

const PackageLevelScope: PackageLevelScope = {} as PackageLevelScope

async function gettingAnimeTextData(browser: Browser, anime: { goto_url: string }): Promise<AnimeTextData> {
  const page = await browser.newPage()

  await page.goto(anime.goto_url, {
    timeout: 0,
    waitUntil: 'networkidle2'
  })

  const animeTextData = await page.evaluate(async function () {
    const verifyNotValidAnime = () => {  
      const pageNotFound = (document.querySelector<HTMLHeadingElement>('h3')?.innerText)
      const episodies = [...document.querySelectorAll('.contentBox ul li > div.box-episodio3')]

      //Page not found
      if (pageNotFound === 'PAGINA NÃO ENCONTRADA') {
        console.log(`Error Message: ${pageNotFound}`);
        return
      }

      // Episodies found
      if (!(episodies.length > 0)) {
        console.log('Episodies Amount: ', episodies.length)
        return
      }
    }

    verifyNotValidAnime()

    const title = document.querySelector('span.color-change') as HTMLSpanElement
    const image = document.querySelector('#capaAnime > img') as HTMLImageElement
    const about = document.querySelectorAll<HTMLTableRowElement>('table > tbody > tr')
    const sinopse = document.querySelectorAll('.single div')
    const rating = document.querySelector('#rmp-rating')
    const allEpisodies = [...document.querySelectorAll('.contentBox ul li > div.box-episodio3')]

    const separateOvaOfEpisodie = (allEpisodies: Element[]) => {
      const episodies: Episodie[] = []
      const ovas: Ova[] = []

      allEpisodies.forEach(episodieOrOva => {
        const title = episodieOrOva.children[0].children[0].innerHTML.trim()
        const thumbnail = episodieOrOva.children[0].children[1].children[0].attributes[0].nodeValue as string
        const quality_streaming = episodieOrOva.children[0].children[1].children[1].textContent as string
        
        if (title.match(/(ova)/gi)) {
          ovas.push({
            title,
            thumbnail,
            quality_streaming
          })
        } else {
          episodies.push({
            title,
            thumbnail,
            quality_streaming
          })
        }
      })
      
      return { episodies, ovas }
    }

    const streamings = separateOvaOfEpisodie(allEpisodies)

    const animeTextData = {
      name: title.innerHTML.trim(),
      image_url: image.src.trim(),
      studio: about[0].children[1].innerHTML.trim(),
      genre: about[1].children[1].innerHTML.trim(),
      status: about[2].children[1].innerHTML.trim(),
      release_data: Number(about[3].children[1].innerHTML.trim()),
      rating: Number(rating?.innerHTML.trim() as string),
      sinopse: sinopse[13].innerHTML.trim(),
      streamings: {
        episodies: streamings.episodies,
        ovas: streamings.ovas
      }
    }

    console.log(`${animeTextData.name} - Detail`, animeTextData)

    return animeTextData
  })

  await page.close()

  return animeTextData
}

async function gettingStreamingsVideoURL(browser: Browser, anime: { name: string, data: AnimeTextData }): Promise<StreamingVideoURL> {
  const streamings: StreamingVideoURL = {
    episodies: [],
    ovas: []
  }

  for (let streamingURLCount = 0; streamingURLCount < anime.data.streamings.episodies.length; streamingURLCount++) {
    const page = await browser.newPage()

    console.log(`> Episodie - ${streamingURLCount+1}`)

    await page.goto(`${config.base_url}/${anime.name}-episodio-${String(streamingURLCount+1)}`, {
      timeout: 0,
      waitUntil: 'networkidle2'
    })
    
    // Getting Animes with Streamings URL
    const streaming: string = await page.evaluate(async function() {
      const streamingURL = document.querySelector('video') as HTMLVideoElement
      const streaming = streamingURL.src
      return streaming
    })

    streamings.episodies.push(streaming)

    await page.close()
  }

  for (let streamingURLCount = 0; streamingURLCount < anime.data.streamings.ovas.length; streamingURLCount++) {
    const page = await browser.newPage()
    
    console.log(`> Ova - ${streamingURLCount+1}`)

    await page.goto(`${config.base_url}/${anime.name}-ova-${String(streamingURLCount+1)}`, {
      timeout: 0,
      waitUntil: 'networkidle2'
    })
    
    // Getting Animes with Streamings URL
    const streaming: string = await page.evaluate(async function() {
      const streamingURL = document.querySelector('video') as HTMLVideoElement
      const streaming = streamingURL.src
      return streaming
    })

    streamings.ovas.push(streaming)
    
    console.log('Terminei de pegar o OVA', `${config.base_url}/${anime.name}-ova-${String(streamingURLCount+1)}`)

    await page.close()
  }
  return streamings
}

async function gettingAnime(browser: Browser, animesNames: string[]): Promise<Anime[]> {
  const animes: Anime[] = []

  for (let index = 0; index < animesNames.length; index++) {
    
    console.log(`> ${index+1}) ${animesNames[index]} - Starting`)

    // Getting Anime Text Data
    console.log('> Getting Text Data')
    const animeTextData: AnimeTextData = await gettingAnimeTextData(browser, {
      goto_url: `${config.base_url}/${animesNames[index]}`
    })

    // Getting Streamings URL
    console.log('> Getting Streamings URL')
    const streamings: StreamingVideoURL = await gettingStreamingsVideoURL(browser, {
      name: animesNames[index],
      data: animeTextData
    })    

    const anime: Anime = {
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

    console.log(anime)

    if (anime) {
      console.log('', '', '', `> ${index+1}) ${animesNames[index]} - Getting Successfully`)
      PackageLevelScope.log += `    > ${index+1}) ${animesNames[index]} - Getting Successfully\n`
      animes.push(anime)
    } else {
      PackageLevelScope.log += `    > ${index+1}) ${animesNames[index]} - Incomplete Episodies or Not Found\n`
      console.log('', '', '', `> ${index+1}) ${animesNames[index]} - Incomplete Episodies or Not Found`)
    }
  }

  return animes
}

function normalize(animesNames: string[]) {
  return animesNames.map(animeName => animeName.trim().toLowerCase())
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

(async function () {
  try { 
    const browser = await puppeteer.launch(config.launch)

    //Getting Animes Routes
    console.log()
    console.log('> Getting Animes Routes')
    const animesRouteParam = await gettingAnimesRouteParam(browser)

    // Getting Animes Data
    console.log('> Getting Animes Data')
    const animes: Anime[] = await gettingAnime(browser, normalize(['charlotte']))
    console.log()
    console.log('Animes', animes)
    console.log()

    Utils.createJSONFile({
      filename: 'database',
      data: animes
    })

    Utils.createLogFile({
      filename: 'console',
      contentText: PackageLevelScope.log
    })

    console.log()
    console.log('> Finish Crawler Script!')

    await browser.close()
  } catch(e) {
    console.log(e)
  } 
})()

console.log('> Running App')