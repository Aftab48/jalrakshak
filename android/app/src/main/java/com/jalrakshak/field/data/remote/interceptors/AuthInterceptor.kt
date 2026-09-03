package com.jalrakshak.field.data.remote.interceptors

import android.content.Context
import com.jalrakshak.field.data.repository.SettingsKeys
import com.jalrakshak.field.data.repository.dataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = runBlocking {
            context.dataStore.data.first()[SettingsKeys.WORKER_TOKEN] ?: ""
        }

        val builder = request.newBuilder()
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")

        if (token.isNotEmpty()) {
            builder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}