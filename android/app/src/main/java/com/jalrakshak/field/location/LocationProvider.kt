package com.jalrakshak.field.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class DeviceLocation(
    val latitude: Double?,
    val longitude: Double?,
    val provider: String?,
    val accuracyMeters: Float?,
    val capturedAt: Long?,
) {
    val isAvailable: Boolean get() = latitude != null && longitude != null
}

class LocationProvider(private val context: Context) {

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): DeviceLocation = suspendCancellableCoroutine { cont ->
        if (!hasPermission()) {
            cont.resume(DeviceLocation(null, null, null, null, null))
            return@suspendCancellableCoroutine
        }

        val client = LocationServices.getFusedLocationProviderClient(context)
        client.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (location != null) {
                    cont.resume(
                        DeviceLocation(
                            latitude = location.latitude,
                            longitude = location.longitude,
                            provider = "gps",
                            accuracyMeters = location.accuracy,
                            capturedAt = location.time,
                        )
                    )
                } else {
                    cont.resume(DeviceLocation(null, null, null, null, null))
                }
            }
            .addOnFailureListener {
                cont.resume(DeviceLocation(null, null, null, null, null))
            }
    }

    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
}