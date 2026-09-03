package com.jalrakshak.field.data.remote.interceptors

import com.jalrakshak.field.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response

class ApiKeyInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val builder = request.newBuilder()
        if (BuildConfig.API_KEY.isNotEmpty()) {
            builder.header("X-API-Key", BuildConfig.API_KEY)
        }
        return chain.proceed(builder.build())
    }
}