'use strict'

let isString = require('lodash/isString')
let isFunction = require('lodash/isFunction')

let errors = require('./errors.js')
let keygen = require('./keygen.js')
let PersistenceLayerBase = require('./PersistenceLayerBase.js')


class Pxl {

    constructor({ persistenceLayer, queryParam = 'pxl', logPxlFailed = function () {} } = {}) {

        if (persistenceLayer instanceof PersistenceLayerBase === false || persistenceLayer.constructor === PersistenceLayerBase) {
            throw new TypeError('options.persistenceLayer must extend Pxl.PersistenceLayerBase')
        }

        if (!isString(queryParam) || queryParam.length === 0) {
            throw new TypeError('options.queryParam must be non-empty string')
        }

        if (!isFunction(logPxlFailed)) {
            throw new TypeError('options.logPxlFailed must be a function')
        }

        this.logPxlFailed = logPxlFailed
        this.persistenceLayer = persistenceLayer
        this.queryParam = queryParam

        this.trackPxl = this.trackPxl.bind(this)
        this.redirect = this.redirect.bind(this)

    }

    createPxl(metadata) {

        return this.persistenceLayer.checkAndAddPxl(keygen(), metadata)
            .catch((err) => {

                if (err.constructor === errors.KeyCollisionError) {
                    return this.createPxl(metadata)
                }

                throw err

            })

    }

    logPxl(pxl) {

        return this.persistenceLayer.logPxl(pxl)

    }

    trackPxl(req, res, next) {

        if (req.query && isString(req.query[this.queryParam]) && req.query[this.queryParam].length > 0) {

            this.logPxl(req.query[this.queryParam])
                .catch(this.logPxlFailed)

        }

        return next()

    }

    shorten(link) {

        return this.persistenceLayer.checkAndAddLink(keygen(), link)
            .catch((err) => {

                if (err.constructor === errors.KeyCollisionError) {
                    return this.shorten(link)
                }

                throw err

            })

    }

    unshorten(linkId) {

        return this.persistenceLayer.lookupLink(linkId)

    }

    redirect(req, res, next) {

        this.unshorten(req.params.linkId)
            .then((link) => {
                res.redirect(link) // Implicit binding to res must remain intact!
            })
            .catch(next)

    }

}

Pxl.errors = errors
Pxl.PersistenceLayerBase = PersistenceLayerBase

module.exports = Pxl