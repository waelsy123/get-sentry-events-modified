#!/usr/bin/env node
const R = require('ramda')
const request = require('request-promise')
const URI = require('urijs')
const generator = require('generate-password')

const SENTRY_API_TOKEN = process.env.SENTRY_API_TOKEN
if (!SENTRY_API_TOKEN) {
  console.log(`Please specify a SENTRY_API_TOKEN environment variable
Visit https://github.com/busbud/get-sentry-event-data#setup for more information`)
  process.exit(1)
}

let emails = []

const BASE_URI = new URI('https://sentry.io/api/0/')

const doc = `
Usage:
  $0 <event_id>
  $0 --pages | number of pages to fetch default to 1
  $0 -h | --help
`.trimRight()

const argv = require('yargs')
  .usage(doc)
  .demand(1)
  .help('help').argv

const pages = parseInt(argv.pages, 10) || 1

const event_id = argv._[0]

function fetch (method, path, options) {
  options = R.merge(
    {
      method: method,
      url: BASE_URI.clone()
        .segment(path)
        .normalize()
        .href(),
      headers: {
        Authorization: `Bearer ${SENTRY_API_TOKEN}`
      },
      json: true,
      resolveWithFullResponse: true
    },
    options || {}
  )

  return request(options)
}

function listIssueEvents (issue_id, max_page = 0, cursor = null) {
  const path = `/issues/${issue_id}/events/`

  const options = {}
  if (cursor) options.qs = { cursor }

  return fetch('GET', path, options).then(res => {
    const events = res.body
    const defaultToEmptyString = R.defaultTo('')
    const findNextLink = R.pipe(
      defaultToEmptyString,
      R.split(','),
      R.filter(
        R.pipe(
          R.match(/rel="next"/),
          R.isEmpty,
          R.not
        )
      ),
      R.head
    )
    const getCursor = R.pipe(
      defaultToEmptyString,
      R.match(/cursor="([a-zA-Z0-9:]*)"/),
      R.pathOr(null, ['1'])
    )
    const next_link_cursor = R.pipe(
      findNextLink,
      getCursor
    )(res.headers.link)
    if (next_link_cursor && max_page !== 0) {
      return listIssueEvents(issue_id, --max_page, next_link_cursor).then(
        R.concat(events)
      )
    }

    return events
  })
}

function format (event) {
  const tags = R.reduce(
    (acc, pair) => {
      if (acc.hasOwnProperty(pair.key)) {
        if (!R.isArrayLike(acc[pair.key])) {
          acc[pair.key] = [acc[pair.key]] // Convert to array so we can append other values
        }

        acc[pair.key].push(pair.value)
      } else {
        acc[pair.key] = pair.value
      }

      return acc
    },
    {},
    R.prop('tags', event)
  )

  let res = R.merge(R.pick(['entries'], event), { tags: tags })

  if (res.entries[3] === undefined) {
    return undefined
  } else {
    res = res.entries[3].data.data
  }

  // generate password
  res.password = generator.generate({
    length: 16,
    numbers: true,
    symbols: false,
    uppercase: true
  })

  // ignore data with null email
  if (res.email === null) return undefined

  // filter location to only last one
  if (res.locations !== undefined) {
    res.locations = [res.locations[res.locations.length - 1]]
  }

  if (emails.includes(res.email)) {
    return undefined
  }
  emails.push(res.email)

  return res
}

listIssueEvents(event_id, 1)
  .then(events => {
    const extracted = R.map(format, events).filter(event => event !== undefined)

    const candidates = extracted
      .filter(event => event.locations !== undefined)
      .map(candidate => ({
        ...candidate,
        // append recovered to lastName
        lastName: `${candidate.lastName}(recovered)`,
        // assign confirm to be same as generated password
        confirm: candidate.password
      }))

    const companyUsers = extracted
      .filter(event => event.taxNumber !== undefined)
      .map(companyUser => ({
        ...companyUser,
        // assign confirm to be same as generated password
        confirmPassword: companyUser.password,
        // append recovered to name
        name: `${companyUser.name}(recovered)`
      }))

    console.log(`Number of candidates: `, candidates.length)
    console.log(`Number of companyUsers: `, companyUsers.length)

    console.log(JSON.stringify(candidates))
    console.log('\n\n\n***************************************\n\n\n')
    console.log(JSON.stringify(companyUsers))

    console.log(
      '\n\n\n***************** candidates CSV **********************\n\n\n'
    )
    console.log('firstName,lastName,email,password')
    candidates.map(c => {
      console.log(`${c.firstName},${c.lastName},${c.email},${c.password}`)
    })

    console.log(
      '\n\n\n***************** company users CSV **********************\n\n\n'
    )
    console.log('name,email,password')
    companyUsers.map(c => {
      console.log(`${c.name},${c.email},${c.password}`)
    })
  })
  .catch(console.error)
