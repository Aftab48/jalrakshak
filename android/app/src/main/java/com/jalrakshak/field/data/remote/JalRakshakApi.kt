package com.jalrakshak.field.data.remote

import com.jalrakshak.field.data.remote.dto.AlertResponse
import com.jalrakshak.field.data.remote.dto.AlertStatusRequest
import com.jalrakshak.field.data.remote.dto.AlertStatusResponse
import com.jalrakshak.field.data.remote.dto.AlertsResponse
import com.jalrakshak.field.data.remote.dto.HealthReportRequest
import com.jalrakshak.field.data.remote.dto.LocationDto
import com.jalrakshak.field.data.remote.dto.LocationsResponse
import com.jalrakshak.field.data.remote.dto.LoginRequest
import com.jalrakshak.field.data.remote.dto.LoginResponse
import com.jalrakshak.field.data.remote.dto.ReportResponse
import com.jalrakshak.field.data.remote.dto.VerificationRequest
import com.jalrakshak.field.data.remote.dto.VerificationResponse
import com.jalrakshak.field.data.remote.dto.WaterQualityRequest
import com.jalrakshak.field.data.remote.dto.WaterQualityResponse
import com.jalrakshak.field.data.remote.dto.WaterSourceDto
import com.jalrakshak.field.data.remote.dto.WaterSourcesResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface JalRakshakApi {

    @POST("api/android/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/android/locations")
    suspend fun getLocations(): LocationsResponse

    @GET("api/android/locations/{id}")
    suspend fun getLocation(@Path("id") id: String): retrofit2.Response<LocationDto>

    @GET("api/android/alerts")
    suspend fun getAlerts(@Query("locationId") locationId: String? = null): AlertsResponse

    @GET("api/android/alerts/{id}")
    suspend fun getAlert(@Path("id") id: String): AlertResponse

    @POST("api/android/alerts/{id}/status")
    suspend fun updateAlertStatus(@Path("id") id: String, @Body body: AlertStatusRequest): AlertStatusResponse

    @GET("api/android/water-sources")
    suspend fun getWaterSources(@Query("locationId") locationId: String? = null): WaterSourcesResponse

    @GET("api/android/water-sources/{id}")
    suspend fun getWaterSource(@Path("id") id: String): retrofit2.Response<WaterSourceDto>

    @POST("api/android/water-quality")
    suspend fun submitWaterQuality(@Body body: WaterQualityRequest): WaterQualityResponse

    @POST("api/android/verifications")
    suspend fun submitVerification(@Body body: VerificationRequest): VerificationResponse

    @POST("api/reports")
    suspend fun submitReport(@Body body: HealthReportRequest): ReportResponse
}